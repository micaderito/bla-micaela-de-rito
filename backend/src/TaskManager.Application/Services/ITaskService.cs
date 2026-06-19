using TaskManager.Application.DTOs;

namespace TaskManager.Application.Services;

/// <summary>Business operations for tasks. All operations are scoped to the owner.</summary>
public interface ITaskService
{
    Task<IReadOnlyList<TaskDto>> GetTasksAsync(Guid userId, DueDatePreset? preset = null, DateTime? dateFrom = null, DateTime? dateTo = null, CancellationToken ct = default);
    Task<TaskDto> GetTaskAsync(Guid userId, Guid taskId, CancellationToken ct = default);
    Task<TaskDto> CreateTaskAsync(Guid userId, CreateTaskDto dto, CancellationToken ct = default);
    Task<TaskDto> UpdateTaskAsync(Guid userId, Guid taskId, UpdateTaskDto dto, CancellationToken ct = default);
    Task DeleteTaskAsync(Guid userId, Guid taskId, CancellationToken ct = default);
}
