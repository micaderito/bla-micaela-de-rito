using TaskManager.Domain.Entities;
using TaskManager.Domain.Enums;

namespace TaskManager.Application.DTOs;

public record CreateTaskDto(string Title, string? Description, TaskItemStatus Status, DateTime? DueDate);

public record UpdateTaskDto(string Title, string? Description, TaskItemStatus Status, DateTime? DueDate);

public record TaskDto(
    Guid Id,
    string Title,
    string? Description,
    TaskItemStatus Status,
    DateTime? DueDate,
    DateTime CreatedAt,
    DateTime UpdatedAt)
{
    public static TaskDto FromEntity(TaskItem t) =>
        new(t.Id, t.Title, t.Description, t.Status, t.DueDate, t.CreatedAt, t.UpdatedAt);
}
