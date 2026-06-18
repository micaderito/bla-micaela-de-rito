using TaskManager.Application.Abstractions;
using TaskManager.Infrastructure.Persistence;
using TaskManager.Infrastructure.Security;

namespace TaskManager.Infrastructure.Tests.Persistence;

/// <summary>
/// Spins up an isolated shared-cache in-memory SQLite database per test (unique
/// data source name) and creates the schema. Implements IDisposable to tear it down.
/// </summary>
public abstract class RepositoryTestBase : IDisposable
{
    protected readonly SqliteConnectionFactory Factory;
    protected readonly IClock Clock = new TestClock();

    protected RepositoryTestBase()
    {
        var dataSource = $"tm-tests-{Guid.NewGuid():N}";
        Factory = new SqliteConnectionFactory(
            $"Data Source={dataSource};Mode=Memory;Cache=Shared");

        new DatabaseInitializer(Factory, new PasswordHasher(), Clock).Initialize(seed: false);
    }

    public void Dispose() => Factory.Dispose();

    private sealed class TestClock : IClock
    {
        public DateTime UtcNow { get; } = new(2026, 6, 16, 12, 0, 0, DateTimeKind.Utc);
    }
}
