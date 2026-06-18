using FluentAssertions;
using TaskManager.Application.Abstractions;
using TaskManager.Infrastructure.Persistence;
using TaskManager.Infrastructure.Security;
using Xunit;

namespace TaskManager.Infrastructure.Tests.Persistence;

public class DatabaseInitializerTests : IDisposable
{
    private readonly SqliteConnectionFactory _factory;
    private readonly IClock _clock = new FixedClock();
    private readonly DatabaseInitializer _sut;

    public DatabaseInitializerTests()
    {
        _factory = new SqliteConnectionFactory(
            $"Data Source=tm-init-{Guid.NewGuid():N};Mode=Memory;Cache=Shared");
        _sut = new DatabaseInitializer(_factory, new PasswordHasher(), _clock);
    }

    public void Dispose() => _factory.Dispose();

    private long CountRows(string table)
    {
        using var conn = _factory.Create();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = $"SELECT COUNT(*) FROM {table}";
        return Convert.ToInt64(cmd.ExecuteScalar());
    }

    [Fact]
    public void Initialize_CreatesSchema()
    {
        _sut.Initialize(seed: false);

        CountRows("Users").Should().Be(0);
        CountRows("Tasks").Should().Be(0);
    }

    [Fact]
    public async Task Initialize_WithSeed_InsertsDemoUserAndTasks()
    {
        _sut.Initialize(seed: true);

        CountRows("Users").Should().Be(1);
        CountRows("Tasks").Should().Be(3);

        var user = await new UserRepository(_factory).GetByUsernameAsync(DatabaseInitializer.DemoUsername);
        user.Should().NotBeNull();
        new PasswordHasher().Verify(DatabaseInitializer.DemoPassword, user!.PasswordHash).Should().BeTrue();
    }

    [Fact]
    public void Initialize_IsIdempotent_DoesNotDuplicateSeed()
    {
        _sut.Initialize(seed: true);
        _sut.Initialize(seed: true);

        CountRows("Users").Should().Be(1);
        CountRows("Tasks").Should().Be(3);
    }

    private sealed class FixedClock : IClock
    {
        public DateTime UtcNow { get; } = new(2026, 6, 16, 12, 0, 0, DateTimeKind.Utc);
    }
}
