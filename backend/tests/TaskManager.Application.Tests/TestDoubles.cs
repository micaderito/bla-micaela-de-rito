using TaskManager.Application.Abstractions;

namespace TaskManager.Application.Tests;

/// <summary>Deterministic clock for date-sensitive tests.</summary>
public sealed class FixedClock(DateTime utcNow) : IClock
{
    public DateTime UtcNow { get; set; } = utcNow;
}
