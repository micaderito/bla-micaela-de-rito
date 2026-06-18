using TaskManager.Application.Abstractions;
using TaskManager.Application.Common;
using TaskManager.Application.DTOs;
using TaskManager.Domain.Entities;
using TaskManager.Domain.Enums;
using TaskManager.Domain.Repositories;

namespace TaskManager.Application.Services;

/// <summary>
/// Business-logic implementation for tasks. Independent of the data layer
/// (talks only to <see cref="ITaskRepository"/>) and of the API.
/// </summary>
public class TaskService(ITaskRepository tasks, IClock clock) : ITaskService
{
    public const int TitleMaxLength = 200;
    public const int DescriptionMaxLength = 2000;

    public async Task<IReadOnlyList<TaskDto>> GetTasksAsync(Guid userId, CancellationToken ct = default)
    {
        var items = await tasks.GetByUserAsync(userId, ct);
        return items.Select(TaskDto.FromEntity).ToList();
    }

    public async Task<TaskDto> GetTaskAsync(Guid userId, Guid taskId, CancellationToken ct = default)
    {
        var task = await GetOwnedTaskAsync(userId, taskId, ct);
        return TaskDto.FromEntity(task);
    }

    public async Task<TaskDto> CreateTaskAsync(Guid userId, CreateTaskDto dto, CancellationToken ct = default)
    {
        ValidateTitle(dto.Title);
        ValidateDescription(dto.Description);
        ValidateStatus(dto.Status);
        ValidateDueDateOnCreate(dto.DueDate);

        var now = clock.UtcNow;
        var task = new TaskItem
        {
            Id = Guid.NewGuid(),
            Title = dto.Title.Trim(),
            Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim(),
            Status = dto.Status,
            DueDate = dto.DueDate,
            UserId = userId,
            CreatedAt = now,
            UpdatedAt = now
        };

        await tasks.AddAsync(task, ct);
        return TaskDto.FromEntity(task);
    }

    public async Task<TaskDto> UpdateTaskAsync(Guid userId, Guid taskId, UpdateTaskDto dto, CancellationToken ct = default)
    {
        ValidateTitle(dto.Title);
        ValidateDescription(dto.Description);
        ValidateStatus(dto.Status);

        var task = await GetOwnedTaskAsync(userId, taskId, ct);

        task.Title = dto.Title.Trim();
        task.Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim();
        task.Status = dto.Status;
        task.DueDate = dto.DueDate;
        task.UpdatedAt = clock.UtcNow;

        await tasks.UpdateAsync(task, ct);
        return TaskDto.FromEntity(task);
    }

    public async Task DeleteTaskAsync(Guid userId, Guid taskId, CancellationToken ct = default)
    {
        var task = await GetOwnedTaskAsync(userId, taskId, ct);
        await tasks.DeleteAsync(task.Id, ct);
    }

    /// <summary>Loads a task and enforces ownership (404 if missing, 403 if owned by someone else).</summary>
    private async Task<TaskItem> GetOwnedTaskAsync(Guid userId, Guid taskId, CancellationToken ct)
    {
        var task = await tasks.GetByIdAsync(taskId, ct)
                   ?? throw new NotFoundException($"Task '{taskId}' was not found.");

        if (task.UserId != userId)
            throw new ForbiddenException("You do not have access to this task.");

        return task;
    }

    private static void ValidateTitle(string? title)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new ValidationException("Title is required.");
        if (title.Trim().Length > TitleMaxLength)
            throw new ValidationException($"Title must be at most {TitleMaxLength} characters.");
    }

    private static void ValidateDescription(string? description)
    {
        if (description is not null && description.Trim().Length > DescriptionMaxLength)
            throw new ValidationException($"Description must be at most {DescriptionMaxLength} characters.");
    }

    private static void ValidateStatus(TaskItemStatus status)
    {
        if (!Enum.IsDefined(status))
            throw new ValidationException("Status is invalid.");
    }

    private void ValidateDueDateOnCreate(DateTime? dueDate)
    {
        if (dueDate is { } due && due.Date < clock.UtcNow.Date)
            throw new ValidationException("Due date cannot be in the past.");
    }
}
