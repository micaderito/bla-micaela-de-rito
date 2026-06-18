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

    public void Initialize(bool seed = true)
    {
        using var connection = factory.Create();
        CreateSchema(connection);
        if (seed) SeedDemoData(connection);
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
}
