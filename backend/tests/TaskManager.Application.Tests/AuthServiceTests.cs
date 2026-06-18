using FluentAssertions;
using Moq;
using TaskManager.Application.Abstractions;
using TaskManager.Application.Common;
using TaskManager.Application.DTOs;
using TaskManager.Application.Services;
using TaskManager.Domain.Entities;
using TaskManager.Domain.Repositories;
using Xunit;

namespace TaskManager.Application.Tests;

public class AuthServiceTests
{
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IPasswordHasher> _hasher = new();
    private readonly Mock<ITokenGenerator> _tokens = new();
    private readonly FixedClock _clock = new(new DateTime(2026, 6, 16, 12, 0, 0, DateTimeKind.Utc));
    private readonly AuthService _sut;

    public AuthServiceTests()
    {
        _sut = new AuthService(_users.Object, _hasher.Object, _tokens.Object, _clock);
        _hasher.Setup(h => h.Hash(It.IsAny<string>())).Returns("hashed");
        _tokens.Setup(t => t.CreateToken(It.IsAny<User>()))
            .Returns(("jwt-token", _clock.UtcNow.AddHours(1)));
    }

    private void NoExistingUsers()
    {
        _users.Setup(u => u.GetByUsernameAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);
        _users.Setup(u => u.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);
    }

    [Fact]
    public async Task Register_WithValidData_PersistsHashedUserAndReturnsToken()
    {
        NoExistingUsers();
        var dto = new RegisterDto("alice", "Alice@Example.com", "password123");

        var result = await _sut.RegisterAsync(dto);

        result.Token.Should().Be("jwt-token");
        result.User.Username.Should().Be("alice");
        result.User.Email.Should().Be("alice@example.com");
        _users.Verify(u => u.AddAsync(
            It.Is<User>(x => x.PasswordHash == "hashed" && x.Email == "alice@example.com"),
            It.IsAny<CancellationToken>()), Times.Once);
        _hasher.Verify(h => h.Hash("password123"), Times.Once);
    }

    [Theory]
    [InlineData("ab", "a@b.com", "password123")]      // username too short
    [InlineData("alice", "not-an-email", "password123")] // bad email
    [InlineData("alice", "a@b.com", "short")]          // password too short
    public async Task Register_WithInvalidData_ThrowsValidation(string user, string email, string pwd)
    {
        var dto = new RegisterDto(user, email, pwd);

        await FluentActions.Awaiting(() => _sut.RegisterAsync(dto))
            .Should().ThrowAsync<ValidationException>();
        _users.Verify(u => u.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Register_WhenUsernameTaken_ThrowsConflict()
    {
        _users.Setup(u => u.GetByUsernameAsync("alice", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Username = "alice" });
        var dto = new RegisterDto("alice", "a@b.com", "password123");

        await FluentActions.Awaiting(() => _sut.RegisterAsync(dto))
            .Should().ThrowAsync<ConflictException>();
    }

    [Fact]
    public async Task Register_WhenEmailTaken_ThrowsConflict()
    {
        _users.Setup(u => u.GetByUsernameAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);
        _users.Setup(u => u.GetByEmailAsync("a@b.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Email = "a@b.com" });
        var dto = new RegisterDto("alice", "a@b.com", "password123");

        await FluentActions.Awaiting(() => _sut.RegisterAsync(dto))
            .Should().ThrowAsync<ConflictException>();
    }

    [Fact]
    public async Task Login_WithValidUsername_ReturnsToken()
    {
        var user = new User { Id = Guid.NewGuid(), Username = "alice", PasswordHash = "hashed" };
        _users.Setup(u => u.GetByUsernameAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(user);
        _hasher.Setup(h => h.Verify("password123", "hashed")).Returns(true);

        var result = await _sut.LoginAsync(new LoginDto("alice", "password123"));

        result.Token.Should().Be("jwt-token");
        result.User.Username.Should().Be("alice");
    }

    [Fact]
    public async Task Login_FallsBackToEmailLookup()
    {
        var user = new User { Id = Guid.NewGuid(), Email = "alice@example.com", PasswordHash = "hashed" };
        _users.Setup(u => u.GetByUsernameAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);
        _users.Setup(u => u.GetByEmailAsync("alice@example.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);
        _hasher.Setup(h => h.Verify("password123", "hashed")).Returns(true);

        var result = await _sut.LoginAsync(new LoginDto("Alice@Example.com", "password123"));

        result.User.Email.Should().Be("alice@example.com");
    }

    [Fact]
    public async Task Login_WithWrongPassword_ThrowsAuthentication()
    {
        var user = new User { Username = "alice", PasswordHash = "hashed" };
        _users.Setup(u => u.GetByUsernameAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(user);
        _hasher.Setup(h => h.Verify(It.IsAny<string>(), It.IsAny<string>())).Returns(false);

        await FluentActions.Awaiting(() => _sut.LoginAsync(new LoginDto("alice", "wrong")))
            .Should().ThrowAsync<AuthenticationException>();
    }

    [Fact]
    public async Task Login_WithUnknownUser_ThrowsAuthentication()
    {
        _users.Setup(u => u.GetByUsernameAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);
        _users.Setup(u => u.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        await FluentActions.Awaiting(() => _sut.LoginAsync(new LoginDto("ghost", "password123")))
            .Should().ThrowAsync<AuthenticationException>();
    }

    [Theory]
    [InlineData("", "password123")]
    [InlineData("alice", "")]
    public async Task Login_WithMissingFields_ThrowsAuthentication(string id, string pwd)
    {
        await FluentActions.Awaiting(() => _sut.LoginAsync(new LoginDto(id, pwd)))
            .Should().ThrowAsync<AuthenticationException>();
    }

    [Fact]
    public async Task GetCurrentUser_WhenExists_ReturnsDto()
    {
        var id = Guid.NewGuid();
        _users.Setup(u => u.GetByIdAsync(id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = id, Username = "alice", Email = "a@b.com" });

        var result = await _sut.GetCurrentUserAsync(id);

        result.Id.Should().Be(id);
    }

    [Fact]
    public async Task GetCurrentUser_WhenMissing_ThrowsNotFound()
    {
        _users.Setup(u => u.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        await FluentActions.Awaiting(() => _sut.GetCurrentUserAsync(Guid.NewGuid()))
            .Should().ThrowAsync<NotFoundException>();
    }
}
