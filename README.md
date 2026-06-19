# Task Manager — .NET Technical Interview Exercise

A full-stack task management application built for the BLA .NET technical interview.
The **backend** is an ASP.NET Core Web API following **Clean Architecture** and built
**test-first (TDD)**. Persistence uses **raw ADO.NET over SQLite** — no Entity Framework,
no Dapper, no MediatR, as required by the brief. The **frontend** is an Angular SPA
(developed alongside this repo).

## User story

> *As a registered user, I can sign up and log in, then create, view, update, complete,
> and delete my own tasks (title, description, status, due date) so I can track my work.
> Tasks are private to the authenticated owner.*

---

## Architecture (Clean Architecture)

```
backend/
  src/
    TaskManager.Domain          Entities, enums, repository interfaces. No dependencies.
    TaskManager.Application      Business logic: services, validation, DTOs, abstractions.
                                 Depends only on Domain. Independent of data layer & API.
    TaskManager.Infrastructure   Raw ADO.NET (SQLite) repositories, DB initializer/seeder,
                                 PBKDF2 password hasher, JWT generator, system clock.
    TaskManager.Api             Controllers, JWT auth, exception middleware, CORS, Swagger.
  tests/
    TaskManager.Domain.Tests
    TaskManager.Application.Tests       (services with mocked repos — the TDD core)
    TaskManager.Infrastructure.Tests    (repositories against real in-memory SQLite)
    TaskManager.Api.Tests               (controller unit tests + WebApplicationFactory
                                         integration tests through the full pipeline)
```

Dependency rule: `Api → Application → Domain` and `Infrastructure → Application → Domain`.
The Application layer defines interfaces (`ITaskRepository`, `IPasswordHasher`,
`ITokenGenerator`, `IClock`) that Infrastructure implements; the Api wires it all up via
dependency injection.

### Why no ORM
The brief forbids EF Core, Dapper and MediatR. Repositories
([`TaskRepository`](backend/src/TaskManager.Infrastructure/Persistence/TaskRepository.cs),
[`UserRepository`](backend/src/TaskManager.Infrastructure/Persistence/UserRepository.cs))
use `Microsoft.Data.Sqlite` directly with hand-written, **parameterized** SQL and manual
row→entity mapping. SQLite was chosen so the demo runs anywhere with zero setup — the
schema is created and demo data seeded automatically on first run.

---

## Prerequisites

- [.NET SDK 10](https://dotnet.microsoft.com/) (developed against 10.0.300)
- Node.js 20+ and the Angular CLI (for the frontend)

---

## Running the backend

```bash
cd backend
dotnet run --project src/TaskManager.Api
```

On startup the API creates `taskmanager.db` (SQLite) if needed and seeds demo data.
Swagger UI is available in Development at the root, e.g. `http://localhost:5xxx/swagger`
(the exact port is printed in the console). Use the **Authorize** button in Swagger with
the JWT returned by `/api/auth/login`.

### Seeded demo credentials

| Username | Password    |
|----------|-------------|
| `demo`   | `Demo1234!` |

The demo user comes with 200 sample tasks as example data.

---

## API reference

Two controllers fulfil the "two APIs" requirement: an **identity** API (`/api/auth`) and
a **tasks** CRUD API (`/api/tasks`).

### Auth API — `/api/auth`

| Method | Route                | Auth      | Description                                  |
|--------|----------------------|-----------|----------------------------------------------|
| POST   | `/api/auth/register` | Anonymous | Create a user; returns a JWT. `201`          |
| POST   | `/api/auth/login`    | Anonymous | Log in; returns a JWT. `200` / `401`         |
| GET    | `/api/auth/me`       | **Bearer**| Current user profile. `200` / `401`          |
| GET    | `/api/auth/public`   | Anonymous | Public, unauthenticated endpoint (contrast). |

### Tasks API — `/api/tasks` (all endpoints require a Bearer token)

| Method | Route             | Description                              | Codes               |
|--------|-------------------|------------------------------------------|---------------------|
| GET    | `/api/tasks`      | List the caller's tasks                  | `200` / `401`       |
| GET    | `/api/tasks/{id}` | Get one task (owner only)                | `200/401/403/404`   |
| POST   | `/api/tasks`      | Create a task                            | `201` / `400/401`   |
| PUT    | `/api/tasks/{id}` | Update a task (owner only)               | `200/400/401/403/404`|
| DELETE | `/api/tasks/{id}` | Delete a task (owner only)               | `204/401/403/404`   |

`status` is serialized as a string: `Pending`, `InProgress`, `Done`. Errors return
RFC 7807 `ProblemDetails` JSON via global exception middleware.

#### Quick smoke test with curl

```bash
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usernameOrEmail":"demo","password":"Demo1234!"}' | jq -r .token)

curl -s http://localhost:5000/api/tasks -H "Authorization: Bearer $TOKEN"
```

---

## Features

- **Authentication** — Register and log in with JWT-based stateless auth (Bearer tokens)
- **Task management**
  - **Add** tasks with title, description, due date
  - **Update** task details and due dates
  - **Delete** tasks with confirmation
  - **Change status** via drag-and-drop (Pending → In Progress → Done)
- **Dashboard** — Responsive task list with status overview
- **Dark/Light mode** — Toggle theme with unified color system (Warm Slate design)
- **Filters** — Filter tasks by due date (Today, This Week, This Month, Overdue)
- **Responsive UI** — Fully responsive layout optimized for mobile, tablet, and desktop
- **Authorization** — Tasks are private to the authenticated owner; cross-user access is forbidden

---

## Testing & coverage

Run the full suite:

```bash
cd backend
dotnet test
```

With coverage (cobertura), excluding framework-generated code via the shared settings:

```bash
cd backend
dotnet test --settings coverlet.runsettings --results-directory ./TestResults
```

Coverage files are written to `TestResults/**/coverage.cobertura.xml`. To produce a
human-readable report, install ReportGenerator once
(`dotnet tool install -g dotnet-reportgenerator-globaltool`) and run:

```bash
reportgenerator -reports:"TestResults/**/coverage.cobertura.xml" -targetdir:coverage-report -reporttypes:Html
```

**Current status:** All tests passing with >80% coverage across all layers
(Infrastructure 100%, Api ~99%, Application ~92%; Domain is plain POCOs).

### Test strategy
- **Application** services are the TDD heart: validation, ownership rules and error paths
  are tested with mocked repositories, hasher, token generator and a `FixedClock`.
- **Infrastructure** repositories run against a real shared-cache **in-memory SQLite**
  database, verifying the hand-written SQL, mapping and foreign keys.
- **Api** has fast controller unit tests (mocked services) plus end-to-end integration
  tests via `WebApplicationFactory` covering registration, login, the full task
  lifecycle, `401` on missing tokens and `403` on cross-user access.

---

## Frontend

The Angular SPA lives in [`frontend/`](frontend/) and consumes the API above (login /
register, responsive task list, create / edit / complete / delete, JWT interceptor and
route guard). To run it:

```bash
cd frontend
npm install
npm start   # http://localhost:4200 (CORS is pre-configured for this origin)
```

---

## Generative AI deliverable

See [docs/genai-deliverable.md](docs/genai-deliverable.md) for the prompt-engineering
write-up required by the exercise (the prompt used to scaffold a task API, sample output,
and how AI suggestions were validated, corrected and hardened).
