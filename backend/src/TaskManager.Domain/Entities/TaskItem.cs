using TaskManager.Domain.Enums;

namespace TaskManager.Domain.Entities;

/// <summary>
/// A task owned by a single user. This is the primary domain object exposed
/// through CRUD endpoints.
/// </summary>
public class TaskItem
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public TaskItemStatus Status { get; set; } = TaskItemStatus.Pending;
    public DateTime? DueDate { get; set; }

    /// <summary>Owner of the task. Tasks are private to their owner.</summary>
    public Guid UserId { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
