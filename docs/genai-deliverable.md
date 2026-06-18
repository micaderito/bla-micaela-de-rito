# Generative AI Tools — Prompt Engineering Write-up

This document answers the "Generative AI tools" section of the exercise: the prompt I
would use to generate a RESTful task-management API, a representative sample of the
generated output, and a critical account of how I validated, corrected and hardened the
AI's suggestions.

---

## 1. The prompt

I treat the model as a senior engineer who needs **constraints, not just a goal**. A vague
"build me a task API" produces plausible-but-wrong code (usually EF Core + a fat
controller). The prompt below front-loads the architecture, the hard constraints, the
contract, and the definition of done.

> **Role & goal**
> You are a senior .NET engineer. Generate an ASP.NET Core (.NET 10) Web API for a task
> management system, following **Clean Architecture** and **test-driven development**.
>
> **Hard constraints**
> - Do **not** use Entity Framework, Dapper, or MediatR. Use **raw ADO.NET with
>   `Microsoft.Data.Sqlite`** and hand-written, **parameterized** SQL.
> - Four projects: `Domain` (entities, enums, repository interfaces, no dependencies),
>   `Application` (services, DTOs, validation, abstractions — depends only on Domain),
>   `Infrastructure` (ADO.NET repositories, password hashing, JWT, clock), `Api`
>   (controllers, DI, middleware). Dependencies point inward only.
>
> **Domain**
> - `TaskItem`: Id (GUID PK), Title, Description (nullable), Status
>   (`Pending|InProgress|Done`), DueDate (nullable), UserId, CreatedAt, UpdatedAt.
> - `User`: Id, Username (unique), Email (unique), PasswordHash, CreatedAt.
> - Tasks are private to their owning user.
>
> **API**
> - Auth API: `POST /api/auth/register`, `POST /api/auth/login` (anonymous, return a JWT),
>   `GET /api/auth/me` (authorized), and one public unauthenticated endpoint.
> - Tasks API: full CRUD under `/api/tasks`, **all endpoints `[Authorize]`**, scoped to the
>   caller. Correct verbs and status codes (201/204/400/401/403/404).
> - Validation in the Application layer (not controllers). Map errors to RFC 7807
>   `ProblemDetails` via middleware.
>
> **Security**
> - Hash passwords with PBKDF2 (`Rfc2898DeriveBytes`), per-user salt, constant-time compare.
> - Sign JWTs with HS256; put the user id in the `sub` claim.
>
> **Tests (write these first)**
> - xUnit + Moq + FluentAssertions. Unit-test the services with mocked repositories and an
>   injectable clock; integration-test the API with `WebApplicationFactory` against an
>   in-memory SQLite database. Target ≥80% coverage.
>
> Produce the solution incrementally, starting with the Domain and the Application service
> tests. Explain any trade-offs.

### Why this prompt works
- **Constraints over wishes.** Naming the forbidden libraries up front is the single most
  important line — otherwise the model defaults to EF Core every time.
- **Inversion of control is spelled out.** Stating the dependency direction and which layer
  owns interfaces prevents the classic "repository in the API project" smell.
- **The contract is explicit.** Listing routes, verbs and status codes makes the output
  reviewable against a checklist instead of vibes.
- **"Tests first"** nudges the model into TDD and gives me an executable spec to validate
  the rest of the generation against.

---

## 2. Representative sample of generated output

A trimmed but faithful sample of what the prompt produces (and what shipped in this repo,
after review):

```csharp
// Application/Services/TaskService.cs
public class TaskService(ITaskRepository tasks, IClock clock) : ITaskService
{
    public async Task<TaskDto> CreateTaskAsync(Guid userId, CreateTaskDto dto, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
            throw new ValidationException("Title is required.");
        if (dto.DueDate is { } due && due.Date < clock.UtcNow.Date)
            throw new ValidationException("Due date cannot be in the past.");

        var now = clock.UtcNow;
        var task = new TaskItem
        {
            Id = Guid.NewGuid(), Title = dto.Title.Trim(), Description = dto.Description,
            Status = dto.Status, DueDate = dto.DueDate, UserId = userId,
            CreatedAt = now, UpdatedAt = now
        };
        await tasks.AddAsync(task, ct);
        return TaskDto.FromEntity(task);
    }

    private async Task<TaskItem> GetOwnedTaskAsync(Guid userId, Guid taskId, CancellationToken ct)
    {
        var task = await tasks.GetByIdAsync(taskId, ct)
                   ?? throw new NotFoundException($"Task '{taskId}' was not found.");
        if (task.UserId != userId)
            throw new ForbiddenException("You do not have access to this task.");
        return task;
    }
}
```

```csharp
// Infrastructure/Persistence/TaskRepository.cs (raw ADO.NET, parameterized)
public async Task AddAsync(TaskItem task, CancellationToken ct = default)
{
    await using var conn = factory.Create();
    await using var cmd = conn.CreateCommand();
    cmd.CommandText =
        """
        INSERT INTO Tasks (Id, Title, Description, Status, DueDate, UserId, CreatedAt, UpdatedAt)
        VALUES ($id, $title, $description, $status, $due, $userId, $createdAt, $updatedAt);
        """;
    cmd.Parameters.AddWithValue("$id", task.Id.ToString());
    cmd.Parameters.AddWithValue("$title", task.Title);
    cmd.Parameters.AddWithValue("$description", (object?)task.Description ?? DBNull.Value);
    cmd.Parameters.AddWithValue("$status", (int)task.Status);
    cmd.Parameters.AddWithValue("$due", (object?)task.DueDate?.ToString("O") ?? DBNull.Value);
    // ... remaining parameters
    await cmd.ExecuteNonQueryAsync(ct);
}
```

---

## 3. How I validated the AI's suggestions

1. **Compile + run the tests.** TDD makes validation objective: the generated service is
   only "right" when its unit tests are green. I ran `dotnet test` after each layer.
2. **Check it against the contract.** I walked the generated routes/verbs/status codes
   against the checklist in the prompt. Anything missing (e.g. the `403` cross-user case)
   became a new failing test.
3. **Read for the architecture smell tests.** Does `Application` reference
   `Microsoft.Data.Sqlite`? Does a controller contain business rules? Does `Domain`
   reference anything? Each of those would be a violation regardless of passing tests.
4. **Manual end-to-end probe.** `curl` against a running instance: register → login →
   create → list → confirm `401` without a token and `403` for another user's task.

---

## 4. What I corrected or improved

The first-pass generation was a good skeleton but needed hardening:

| AI tendency | Correction applied |
|-------------|--------------------|
| Reached for **EF Core** despite the brief | Replaced with `Microsoft.Data.Sqlite` + parameterized SQL and manual mapping. |
| Used `DateTime.UtcNow` directly in services | Introduced `IClock` so date rules (past-due-date) are deterministically testable. |
| Threw bare `Exception`/returned `null` | Introduced a typed exception hierarchy (`ValidationException`, `NotFoundException`, `ConflictException`, `ForbiddenException`, `AuthenticationException`) mapped to HTTP codes in one middleware. |
| Validation crept into controllers | Moved all rules into the Application services; controllers stay thin. |
| **JWT validation key read at startup** while the token was signed from `IOptions` at request time | Bound `JwtBearerOptions` from the same `IOptions<JwtOptions>` (`ConfigureJwtBearerOptions`) so issuance and validation can never drift — this was a real bug that surfaced as `401`s only under test config overrides. |
| Stored passwords with a fast/again-able hash | PBKDF2, 100k iterations, per-user 128-bit salt, `CryptographicOperations.FixedTimeEquals`. |

---

## 5. Edge cases, authentication and validation

- **Ownership / authorization.** Every task operation loads the entity and checks
  `task.UserId == callerId`: missing → `404`, someone else's → `403`. Covered by an
  integration test where an intruder requests another user's task.
- **Input validation.** Empty/over-long titles, past due dates on create, invalid enum
  values, weak passwords, malformed emails and duplicate username/email are all rejected
  in the Application layer with `400`/`409`.
- **Auth edge cases.** Login is uniform on "user not found" vs "wrong password" (both
  `401`, no user-enumeration). Tokens carry `sub`, `unique_name`, `email`, `jti`, and a
  bounded lifetime with 30s clock skew.
- **Data-layer correctness.** SQL is fully parameterized (no string concatenation →
  no SQL injection); nullable columns round-trip through `DBNull`; dates are stored as
  round-trippable ISO-8601 (`"O"`); a foreign key with `ON DELETE CASCADE` ties tasks to
  users; tests assert FK enforcement and ordering.
- **Idempotent seeding.** The demo user has a fixed id so re-running startup never
  duplicates seed data.

### Critical-thinking takeaway
Generative AI is excellent at producing a *conventional* solution fast, which is exactly
why the constraints and the test suite matter: they convert "looks plausible" into
"provably meets the brief." The most valuable human contributions here were (a) refusing
the default ORM, (b) the testability seams (`IClock`, repository interfaces), and (c)
catching the JWT issuance/validation drift — a subtle bug the model happily generated and
that only a running test caught.
