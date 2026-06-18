using TaskManager.Domain.Entities;

namespace TaskManager.Domain.Repositories;

/// <summary>
/// Persistence contract for <see cref="User"/>. Implemented in the
/// Infrastructure layer with raw ADO.NET.
/// </summary>
public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<User?> GetByUsernameAsync(string username, CancellationToken ct = default);
    Task<User?> GetByEmailAsync(string email, CancellationToken ct = default);
    Task AddAsync(User user, CancellationToken ct = default);
}
