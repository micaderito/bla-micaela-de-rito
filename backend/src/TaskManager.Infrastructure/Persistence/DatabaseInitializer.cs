using Microsoft.Data.Sqlite;
using TaskManager.Application.Abstractions;
using TaskManager.Domain.Enums;

namespace TaskManager.Infrastructure.Persistence;

/// <summary>
/// Creates the schema if it does not exist and seeds demo data for the
/// out-of-the-box experience. Safe to call repeatedly (idempotent).
/// </summary>
public sealed class DatabaseInitializer(
    ISqliteConnectionFactory factory,
    IPasswordHasher passwordHasher,
    IClock clock)
{
    /// <summary>Stable id so re-seeding never duplicates the demo user.</summary>
    public static readonly Guid DemoUserId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    public const string DemoUsername = "demo";
    public const string DemoEmail = "demo@taskmanager.dev";
    public const string DemoPassword = "Demo1234!";

    /// <summary>Approximate number of bulk tasks seeded for the demo user.</summary>
    private const int BulkTaskTarget = 200;

    public void Initialize(bool seed = true)
    {
        using var connection = factory.Create();
        CreateSchema(connection);
        if (seed)
        {
            SeedDemoData(connection);
            SeedBulkData(connection);
        }
    }

    private static void CreateSchema(SqliteConnection connection)
    {
        using var cmd = connection.CreateCommand();
        cmd.CommandText =
            """
            CREATE TABLE IF NOT EXISTS Users (
                Id           TEXT PRIMARY KEY,
                Username     TEXT NOT NULL UNIQUE COLLATE NOCASE,
                Email        TEXT NOT NULL UNIQUE COLLATE NOCASE,
                PasswordHash TEXT NOT NULL,
                CreatedAt    TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS Tasks (
                Id          TEXT PRIMARY KEY,
                Title       TEXT NOT NULL,
                Description TEXT NULL,
                Status      INTEGER NOT NULL,
                DueDate     TEXT NULL,
                UserId      TEXT NOT NULL,
                CreatedAt   TEXT NOT NULL,
                UpdatedAt   TEXT NOT NULL,
                FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS IX_Tasks_UserId ON Tasks(UserId);
            """;
        cmd.ExecuteNonQuery();
    }

    private void SeedDemoData(SqliteConnection connection)
    {
        using (var check = connection.CreateCommand())
        {
            check.CommandText = "SELECT COUNT(*) FROM Tasks WHERE UserId = $id";
            check.Parameters.AddWithValue("$id", DemoUserId.ToString());
            if (Convert.ToInt64(check.ExecuteScalar()) > 0) return;
        }

        using (var ensureUser = connection.CreateCommand())
        {
            ensureUser.CommandText =
                """
                INSERT OR IGNORE INTO Users (Id, Username, Email, PasswordHash, CreatedAt)
                VALUES ($id, $username, $email, $hash, $createdAt);
                """;
            ensureUser.Parameters.AddWithValue("$id", DemoUserId.ToString());
            ensureUser.Parameters.AddWithValue("$username", DemoUsername);
            ensureUser.Parameters.AddWithValue("$email", DemoEmail);
            ensureUser.Parameters.AddWithValue("$hash", passwordHasher.Hash(DemoPassword));
            ensureUser.Parameters.AddWithValue("$createdAt", clock.UtcNow.ToString("O"));
            ensureUser.ExecuteNonQuery();
        }

        var now = clock.UtcNow;

        var samples = new[]
        {
            ("Welcome to Task Manager", "This is a seeded demo task. Edit or delete it!", TaskItemStatus.Pending, now.AddDays(2)),
            ("Try editing a task", "Open this task and change its status to In Progress.", TaskItemStatus.InProgress, now.AddDays(5)),
            ("Mark a task as done", "Completed tasks show with a different style.", TaskItemStatus.Done, (DateTime?)null)
        };

        foreach (var (title, description, status, due) in samples)
        {
            using var insertTask = connection.CreateCommand();
            insertTask.CommandText =
                """
                INSERT INTO Tasks (Id, Title, Description, Status, DueDate, UserId, CreatedAt, UpdatedAt)
                VALUES ($id, $title, $description, $status, $due, $userId, $createdAt, $updatedAt);
                """;
            insertTask.Parameters.AddWithValue("$id", Guid.NewGuid().ToString());
            insertTask.Parameters.AddWithValue("$title", title);
            insertTask.Parameters.AddWithValue("$description", (object?)description ?? DBNull.Value);
            insertTask.Parameters.AddWithValue("$status", (int)status);
            insertTask.Parameters.AddWithValue("$due", (object?)due?.ToString("O") ?? DBNull.Value);
            insertTask.Parameters.AddWithValue("$userId", DemoUserId.ToString());
            insertTask.Parameters.AddWithValue("$createdAt", now.ToString("O"));
            insertTask.Parameters.AddWithValue("$updatedAt", now.ToString("O"));
            insertTask.ExecuteNonQuery();
        }
    }

    /// <summary>
    /// Seeds ~<see cref="BulkTaskTarget"/> tasks for the demo user with a mix of
    /// statuses, due dates and timestamps so there is realistic volume to
    /// process and analyze. Deterministic (fixed RNG seed) and idempotent.
    /// </summary>
    private void SeedBulkData(SqliteConnection connection)
    {
        // Idempotency: the demo seed inserts 3 tasks; anything beyond that
        // means the bulk data is already present.
        using (var check = connection.CreateCommand())
        {
            check.CommandText = "SELECT COUNT(*) FROM Tasks WHERE UserId = $id";
            check.Parameters.AddWithValue("$id", DemoUserId.ToString());
            if (Convert.ToInt64(check.ExecuteScalar()) > 3) return;
        }

        var now = clock.UtcNow;

        using var transaction = connection.BeginTransaction();

        // Fixed seed keeps the generated data reproducible across runs.
        var rng = new Random(12345);
        var statuses = Enum.GetValues<TaskItemStatus>();

        for (var i = 0; i < BulkTaskTarget; i++)
        {
            var status = statuses[rng.Next(statuses.Length)];

            // Spread creation over the last ~90 days; updated >= created.
            var createdAt = now.AddDays(-rng.Next(0, 90)).AddHours(-rng.Next(0, 24));
            var updatedAt = status == TaskItemStatus.Pending
                ? createdAt
                : createdAt.AddHours(rng.Next(1, 72));

            // Mix of overdue, upcoming and unscheduled tasks.
            DateTime? dueDate = rng.Next(0, 4) switch
            {
                0 => null,
                1 => now.AddDays(-rng.Next(1, 30)),   // overdue
                _ => now.AddDays(rng.Next(1, 45))      // upcoming
            };

            var verb = TaskVerbs[rng.Next(TaskVerbs.Length)];
            var subject = TaskSubjects[rng.Next(TaskSubjects.Length)];

            using var insertTask = connection.CreateCommand();
            insertTask.Transaction = transaction;
            insertTask.CommandText =
                """
                INSERT INTO Tasks (Id, Title, Description, Status, DueDate, UserId, CreatedAt, UpdatedAt)
                VALUES ($id, $title, $description, $status, $due, $userId, $createdAt, $updatedAt);
                """;
            insertTask.Parameters.AddWithValue("$id", Guid.NewGuid().ToString());
            insertTask.Parameters.AddWithValue("$title", $"{verb} {subject}");
            insertTask.Parameters.AddWithValue("$description", $"{verb} {subject} — seeded sample task #{i + 1}.");
            insertTask.Parameters.AddWithValue("$status", (int)status);
            insertTask.Parameters.AddWithValue("$due", (object?)dueDate?.ToString("O") ?? DBNull.Value);
            insertTask.Parameters.AddWithValue("$userId", DemoUserId.ToString());
            insertTask.Parameters.AddWithValue("$createdAt", createdAt.ToString("O"));
            insertTask.Parameters.AddWithValue("$updatedAt", updatedAt.ToString("O"));
            insertTask.ExecuteNonQuery();
        }

        transaction.Commit();
    }

    private static readonly string[] TaskVerbs =
        ["Review", "Update", "Fix", "Refactor", "Document", "Test", "Deploy", "Investigate", "Plan", "Design"];

    private static readonly string[] TaskSubjects =
        ["the login flow", "the dashboard", "API rate limits", "the database schema", "the CI pipeline",
         "user onboarding", "the billing module", "search indexing", "the mobile layout", "error reporting",
         "the export feature", "cache invalidation", "the settings page", "audit logging", "the notification service"];
}
