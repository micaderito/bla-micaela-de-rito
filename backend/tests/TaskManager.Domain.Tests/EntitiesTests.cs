using FluentAssertions;
using TaskManager.Domain.Entities;
using TaskManager.Domain.Enums;
using Xunit;

namespace TaskManager.Domain.Tests;

public class EntitiesTests
{
    [Fact]
    public void TaskItem_Defaults_AreSensible()
    {
        var task = new TaskItem();

        task.Title.Should().BeEmpty();
        task.Description.Should().BeNull();
        task.Status.Should().Be(TaskItemStatus.Pending);
        task.DueDate.Should().BeNull();
    }

    [Fact]
    public void User_Defaults_AreEmptyStrings()
    {
        var user = new User();

        user.Username.Should().BeEmpty();
        user.Email.Should().BeEmpty();
        user.PasswordHash.Should().BeEmpty();
    }

    [Theory]
    [InlineData(TaskItemStatus.Pending, 0)]
    [InlineData(TaskItemStatus.InProgress, 1)]
    [InlineData(TaskItemStatus.Done, 2)]
    public void TaskItemStatus_HasStableIntegerValues(TaskItemStatus status, int expected)
    {
        ((int)status).Should().Be(expected);
    }

    [Fact]
    public void TaskItem_CanRoundTripAllProperties()
    {
        var id = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var due = DateTime.UtcNow.AddDays(3);

        var task = new TaskItem
        {
            Id = id,
            Title = "Write tests",
            Description = "Cover the domain",
            Status = TaskItemStatus.InProgress,
            DueDate = due,
            UserId = userId
        };

        task.Id.Should().Be(id);
        task.Title.Should().Be("Write tests");
        task.Description.Should().Be("Cover the domain");
        task.Status.Should().Be(TaskItemStatus.InProgress);
        task.DueDate.Should().Be(due);
        task.UserId.Should().Be(userId);
    }
}
