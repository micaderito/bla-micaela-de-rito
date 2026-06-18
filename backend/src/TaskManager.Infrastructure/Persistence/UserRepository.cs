using System.Globalization;
using Microsoft.Data.Sqlite;
using TaskManager.Domain.Entities;
using TaskManager.Domain.Repositories;

namespace TaskManager.Infrastructure.Persistence;

/// <summary>ADO.NET (raw SQL) implementation of <see cref="IUserRepository"/>.</summary>
public sealed class UserRepository(ISqliteConnectionFactory factory) : IUserRepository
{
    private const string Columns = "Id, Username, Email, PasswordHash, CreatedAt";

    public async Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await QuerySingleAsync($"SELECT {Columns} FROM Users WHERE Id = $value", id.ToString(), ct);

    public async Task<User?> GetByUsernameAsync(string username, CancellationToken ct = default)
        => await QuerySingleAsync($"SELECT {Columns} FROM Users WHERE Username = $value", username, ct);

    public async Task<User?> GetByEmailAsync(string email, CancellationToken ct = default)
        => await QuerySingleAsync($"SELECT {Columns} FROM Users WHERE Email = $value", email, ct);

    public async Task AddAsync(User user, CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText =
            """
            INSERT INTO Users (Id, Username, Email, PasswordHash, CreatedAt)
            VALUES ($id, $username, $email, $hash, $createdAt);
            """;
        cmd.Parameters.AddWithValue("$id", user.Id.ToString());
        cmd.Parameters.AddWithValue("$username", user.Username);
        cmd.Parameters.AddWithValue("$email", user.Email);
        cmd.Parameters.AddWithValue("$hash", user.PasswordHash);
        cmd.Parameters.AddWithValue("$createdAt", user.CreatedAt.ToString("O"));
        await cmd.ExecuteNonQueryAsync(ct);
    }

    private async Task<User?> QuerySingleAsync(string sql, string value, CancellationToken ct)
    {
        await using var conn = factory.Create();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        cmd.Parameters.AddWithValue("$value", value);

        await using var reader = await cmd.ExecuteReaderAsync(ct);
        return await reader.ReadAsync(ct) ? Map(reader) : null;
    }

    private static User Map(SqliteDataReader r) => new()
    {
        Id = Guid.Parse(r.GetString(0)),
        Username = r.GetString(1),
        Email = r.GetString(2),
        PasswordHash = r.GetString(3),
        CreatedAt = DateTime.Parse(r.GetString(4), CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind)
    };
}
