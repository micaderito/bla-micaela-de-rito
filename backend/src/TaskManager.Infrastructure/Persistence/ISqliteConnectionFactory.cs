using Microsoft.Data.Sqlite;

namespace TaskManager.Infrastructure.Persistence;

/// <summary>Creates open SQLite connections for the repositories.</summary>
public interface ISqliteConnectionFactory
{
    /// <summary>Returns a new, already-opened connection. Caller disposes it.</summary>
    SqliteConnection Create();
}
