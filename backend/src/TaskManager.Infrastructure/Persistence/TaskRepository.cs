using System.Globalization;
using Microsoft.Data.Sqlite;
using TaskManager.Domain.Entities;
using TaskManager.Domain.Enums;
using TaskManager.Domain.Repositories;

namespace TaskManager.Infrastructure.Persistence;

/// <summary>ADO.NET (raw SQL) implementation of <see cref="ITaskRepository"/>.</summary>
public sealed class TaskRepository(ISqliteConnectionFactory factory) : ITaskRepository
{
    private const string Columns =
        "Id, Title, Description, Status, DueDate, UserId, CreatedAt, UpdatedAt";

    public async Task<IReadOnlyList<TaskItem>> GetByUserAsync(Guid userId, CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText =
            $"SELECT {Columns} FROM Tasks WHERE UserId = $userId ORDER BY CreatedAt DESC";
        cmd.Parameters.AddWithValue("$userId", userId.ToString());

        var results = new List<TaskItem>();
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
            results.Add(Map(reader));
        return results;
    }

    public async Task<TaskItem?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"SELECT {Columns} FROM Tasks WHERE Id = $id";
        cmd.Parameters.AddWithValue("$id", id.ToString());

        await using var reader = await cmd.ExecuteReaderAsync(ct);
        return await reader.ReadAsync(ct) ? Map(reader) : null;
    }

    public async Task AddAsync(TaskItem task, CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText =
            """
            INSERT INTO Tasks (Id, Title, Description, Status, DueDate, UserId, CreatedAt, UpdatedAt)
            VALUES ($id, $title, $description, $status, $due, $userId, $createdAt, $updatedAt);
            """;
        BindWritableParameters(cmd, task);
        cmd.Parameters.AddWithValue("$id", task.Id.ToString());
        cmd.Parameters.AddWithValue("$userId", task.UserId.ToString());
        cmd.Parameters.AddWithValue("$createdAt", task.CreatedAt.ToString("O"));
        await cmd.ExecuteNonQueryAsync(ct);
    }

    public async Task UpdateAsync(TaskItem task, CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText =
            """
            UPDATE Tasks
            SET Title = $title, Description = $description, Status = $status,
                DueDate = $due, UpdatedAt = $updatedAt
            WHERE Id = $id;
            """;
        BindWritableParameters(cmd, task);
        cmd.Parameters.AddWithValue("$id", task.Id.ToString());
        await cmd.ExecuteNonQueryAsync(ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "DELETE FROM Tasks WHERE Id = $id";
        cmd.Parameters.AddWithValue("$id", id.ToString());
        await cmd.ExecuteNonQueryAsync(ct);
    }

    /// <summary>Binds the parameters shared by INSERT and UPDATE.</summary>
    private static void BindWritableParameters(SqliteCommand cmd, TaskItem task)
    {
        cmd.Parameters.AddWithValue("$title", task.Title);
        cmd.Parameters.AddWithValue("$description", (object?)task.Description ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$status", (int)task.Status);
        cmd.Parameters.AddWithValue("$due", (object?)task.DueDate?.ToString("O") ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$updatedAt", task.UpdatedAt.ToString("O"));
    }

    private static TaskItem Map(SqliteDataReader r) => new()
    {
        Id = Guid.Parse(r.GetString(0)),
        Title = r.GetString(1),
        Description = r.IsDBNull(2) ? null : r.GetString(2),
        Status = (TaskItemStatus)r.GetInt32(3),
        DueDate = r.IsDBNull(4)
            ? null
            : DateTime.Parse(r.GetString(4), CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind),
        UserId = Guid.Parse(r.GetString(5)),
        CreatedAt = DateTime.Parse(r.GetString(6), CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind),
        UpdatedAt = DateTime.Parse(r.GetString(7), CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind)
    };
}
