namespace TaskManager.Domain.Enums;

/// <summary>
/// Lifecycle state of a task. Stored as its integer value in the data store.
/// </summary>
public enum TaskItemStatus
{
    Pending = 0,
    InProgress = 1,
    Done = 2
}
