using System.Text.RegularExpressions;
using TaskManager.Application.Abstractions;
using TaskManager.Application.Common;
using TaskManager.Application.DTOs;
using TaskManager.Domain.Entities;
using TaskManager.Domain.Repositories;

namespace TaskManager.Application.Services;

/// <summary>
/// Registration and authentication business logic. Independent of the data
/// layer (uses <see cref="IUserRepository"/>) and the API.
/// </summary>
public partial class AuthService(
    IUserRepository users,
    IPasswordHasher passwordHasher,
    ITokenGenerator tokenGenerator,
    IClock clock) : IAuthService
{
    public const int UsernameMinLength = 3;
    public const int PasswordMinLength = 8;

    public async Task<AuthResultDto> RegisterAsync(RegisterDto dto, CancellationToken ct = default)
    {
        ValidateUsername(dto.Username);
        ValidateEmail(dto.Email);
        ValidatePassword(dto.Password);

        var username = dto.Username.Trim();
        var email = dto.Email.Trim().ToLowerInvariant();

        if (await users.GetByUsernameAsync(username, ct) is not null)
            throw new ConflictException("Username is already taken.");
        if (await users.GetByEmailAsync(email, ct) is not null)
            throw new ConflictException("Email is already registered.");

        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = username,
            Email = email,
            PasswordHash = passwordHasher.Hash(dto.Password),
            CreatedAt = clock.UtcNow
        };

        await users.AddAsync(user, ct);
        return BuildAuthResult(user);
    }

    public async Task<AuthResultDto> LoginAsync(LoginDto dto, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(dto.UsernameOrEmail) || string.IsNullOrWhiteSpace(dto.Password))
            throw new AuthenticationException("Invalid credentials.");

        var identifier = dto.UsernameOrEmail.Trim();
        var user = await users.GetByUsernameAsync(identifier, ct)
                   ?? await users.GetByEmailAsync(identifier.ToLowerInvariant(), ct);

        if (user is null || !passwordHasher.Verify(dto.Password, user.PasswordHash))
            throw new AuthenticationException("Invalid credentials.");

        return BuildAuthResult(user);
    }

    public async Task<UserDto> GetCurrentUserAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await users.GetByIdAsync(userId, ct)
                   ?? throw new NotFoundException("User was not found.");
        return UserDto.FromEntity(user);
    }

    private AuthResultDto BuildAuthResult(User user)
    {
        var (token, expiresAt) = tokenGenerator.CreateToken(user);
        return new AuthResultDto(token, expiresAt, UserDto.FromEntity(user));
    }

    private static void ValidateUsername(string? username)
    {
        if (string.IsNullOrWhiteSpace(username) || username.Trim().Length < UsernameMinLength)
            throw new ValidationException($"Username must be at least {UsernameMinLength} characters.");
    }

    private static void ValidateEmail(string? email)
    {
        if (string.IsNullOrWhiteSpace(email) || !EmailRegex().IsMatch(email.Trim()))
            throw new ValidationException("A valid email is required.");
    }

    private static void ValidatePassword(string? password)
    {
        if (string.IsNullOrWhiteSpace(password) || password.Length < PasswordMinLength)
            throw new ValidationException($"Password must be at least {PasswordMinLength} characters.");
    }

    [GeneratedRegex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$")]
    private static partial Regex EmailRegex();
}
