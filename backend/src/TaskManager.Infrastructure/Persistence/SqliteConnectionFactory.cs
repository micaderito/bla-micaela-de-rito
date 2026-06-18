using Microsoft.Data.Sqlite;

namespace TaskManager.Infrastructure.Persistence;

/// <summary>
/// Default connection factory. For in-memory shared-cache databases it holds a
/// single keep-alive connection so the database survives between operations
/// (an in-memory SQLite DB is dropped once its last connection closes).
/// </summary>
public sealed class SqliteConnectionFactory : ISqliteConnectionFactory, IDisposable
{
    private readonly string _connectionString;
    private readonly SqliteConnection? _keepAlive;

    public SqliteConnectionFactory(string connectionString)
    {
        _connectionString = connectionString;

        if (IsSharedInMemory(connectionString))
        {
            _keepAlive = new SqliteConnection(connectionString);
            _keepAlive.Open();
        }
    }

    public SqliteConnection Create()
    {
        var connection = new SqliteConnection(_connectionString);
        connection.Open();
        return connection;
    }

    private static bool IsSharedInMemory(string connectionString)
    {
        var builder = new SqliteConnectionStringBuilder(connectionString);
        return builder.Mode == SqliteOpenMode.Memory || builder.DataSource.Contains(":memory:");
    }

    public void Dispose() => _keepAlive?.Dispose();
}
