using TaskManager.Application.DTOs;

namespace TaskManager.Application.Services;

/// <summary>User registration, login and lookup.</summary>
public interface IAuthService
{
    Task<AuthResultDto> RegisterAsync(RegisterDto dto, CancellationToken ct = default);
    Task<AuthResultDto> LoginAsync(LoginDto dto, CancellationToken ct = default);
    Task<UserDto> GetCurrentUserAsync(Guid userId, CancellationToken ct = default);
}
