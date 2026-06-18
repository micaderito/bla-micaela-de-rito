using TaskManager.Domain.Entities;

namespace TaskManager.Application.DTOs;

public record RegisterDto(string Username, string Email, string Password);

public record LoginDto(string UsernameOrEmail, string Password);

public record UserDto(Guid Id, string Username, string Email, DateTime CreatedAt)
{
    public static UserDto FromEntity(User u) => new(u.Id, u.Username, u.Email, u.CreatedAt);
}

public record AuthResultDto(string Token, DateTime ExpiresAtUtc, UserDto User);
