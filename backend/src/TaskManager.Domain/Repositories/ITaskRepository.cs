using TaskManager.Domain.Entities;

namespace TaskManager.Domain.Repositories;

/// <summary>
/// Persistence contract for <see cref="TaskItem"/>. Implemented in the
/// Infrastructure layer with raw ADO.NET; consumed by the Application layer.
/// </summary>
public interface ITaskRepository
{
    Task<IReadOnlyList<TaskItem>> GetByUserAsync(Guid userId, DateTime? dueDateFrom, DateTime? dueDateTo, CancellationToken ct = default);
    Task<TaskItem?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task AddAsync(TaskItem task, CancellationToken ct = default);
    Task UpdateAsync(TaskItem task, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}
