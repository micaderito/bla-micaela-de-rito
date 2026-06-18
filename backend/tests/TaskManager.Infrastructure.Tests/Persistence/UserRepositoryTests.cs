using FluentAssertions;
using TaskManager.Domain.Entities;
using TaskManager.Infrastructure.Persistence;
using Xunit;

namespace TaskManager.Infrastructure.Tests.Persistence;

public class UserRepositoryTests : RepositoryTestBase
{
    private readonly UserRepository _sut;

    public UserRepositoryTests() => _sut = new UserRepository(Factory);

    private User NewUser(string username = "alice", string email = "alice@example.com") => new()
    {
        Id = Guid.NewGuid(),
        Username = username,
        Email = email,
        PasswordHash = "hash",
        CreatedAt = Clock.UtcNow
    };

    [Fact]
    public async Task Add_ThenGetById_RoundTrips()
    {
        var user = NewUser();
        await _sut.AddAsync(user);

        var loaded = await _sut.GetByIdAsync(user.Id);

        loaded.Should().NotBeNull();
        loaded!.Username.Should().Be("alice");
        loaded.Email.Should().Be("alice@example.com");
        loaded.PasswordHash.Should().Be("hash");
        loaded.CreatedAt.Should().BeCloseTo(user.CreatedAt, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public async Task GetByUsername_IsCaseInsensitive()
    {
        await _sut.AddAsync(NewUser(username: "Alice"));

        var loaded = await _sut.GetByUsernameAsync("alice");

        loaded.Should().NotBeNull();
    }

    [Fact]
    public async Task GetByEmail_ReturnsUser()
    {
        await _sut.AddAsync(NewUser(email: "bob@example.com"));

        var loaded = await _sut.GetByEmailAsync("bob@example.com");

        loaded.Should().NotBeNull();
    }

    [Fact]
    public async Task GetById_WhenMissing_ReturnsNull()
    {
        var loaded = await _sut.GetByIdAsync(Guid.NewGuid());

        loaded.Should().BeNull();
    }
}
