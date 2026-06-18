namespace TaskManager.Application.Abstractions;

/// <summary>Abstracts the current time so date-dependent logic stays testable.</summary>
public interface IClock
{
    DateTime UtcNow { get; }
}
