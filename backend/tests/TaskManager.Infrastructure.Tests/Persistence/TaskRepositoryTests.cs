using FluentAssertions;
using TaskManager.Domain.Entities;
using TaskManager.Domain.Enums;
using TaskManager.Infrastructure.Persistence;
using Xunit;

namespace TaskManager.Infrastructure.Tests.Persistence;

public class TaskRepositoryTests : RepositoryTestBase
{
    private readonly TaskRepository _sut;
    private readonly UserRepository _users;
    private readonly Guid _userId = Guid.NewGuid();

    public TaskRepositoryTests()
    {
        _sut = new TaskRepository(Factory);
        _users = new UserRepository(Factory);
        EnsureUser(_userId);
    }

    /// <summary>Creates an owner so the Tasks.UserId foreign key is satisfied.</summary>
    private void EnsureUser(Guid id) => _users.AddAsync(new User
    {
        Id = id,
        Username = $"user-{id:N}",
        Email = $"{id:N}@example.com",
        PasswordHash = "hash",
        CreatedAt = Clock.UtcNow
    }).GetAwaiter().GetResult();

    private TaskItem NewTask(Guid? userId = null, string title = "Task") => new()
    {
        Id = Guid.NewGuid(),
        Title = title,
        Description = "desc",
        Status = TaskItemStatus.Pending,
        DueDate = Clock.UtcNow.AddDays(3),
        UserId = userId ?? _userId,
        CreatedAt = Clock.UtcNow,
        UpdatedAt = Clock.UtcNow
    };

    [Fact]
    public async Task Add_ThenGetById_RoundTripsAllFields()
    {
        var task = NewTask();
        await _sut.AddAsync(task);

        var loaded = await _sut.GetByIdAsync(task.Id);

        loaded.Should().NotBeNull();
        loaded!.Title.Should().Be("Task");
        loaded.Description.Should().Be("desc");
        loaded.Status.Should().Be(TaskItemStatus.Pending);
        loaded.DueDate.Should().BeCloseTo(task.DueDate!.Value, TimeSpan.FromSeconds(1));
        loaded.UserId.Should().Be(_userId);
    }

    [Fact]
    public async Task Add_WithNullOptionalFields_RoundTrips()
    {
        var task = NewTask();
        task.Description = null;
        task.DueDate = null;
        await _sut.AddAsync(task);

        var loaded = await _sut.GetByIdAsync(task.Id);

        loaded!.Description.Should().BeNull();
        loaded.DueDate.Should().BeNull();
    }

    [Fact]
    public async Task GetByUser_ReturnsOnlyOwnersTasks_OrderedNewestFirst()
    {
        var older = NewTask(title: "older");
        older.CreatedAt = Clock.UtcNow.AddHours(-2);
        var newer = NewTask(title: "newer");
        var otherUserId = Guid.NewGuid();
        EnsureUser(otherUserId);
        var otherUsers = NewTask(userId: otherUserId, title: "other");

        await _sut.AddAsync(older);
        await _sut.AddAsync(newer);
        await _sut.AddAsync(otherUsers);

        var result = await _sut.GetByUserAsync(_userId, null, null);

        result.Should().HaveCount(2);
        result.Select(t => t.Title).Should().ContainInOrder("newer", "older");
        result.Should().NotContain(t => t.Title == "other");
    }

    [Fact]
    public async Task Update_PersistsChanges()
    {
        var task = NewTask();
        await _sut.AddAsync(task);

        task.Title = "Updated";
        task.Status = TaskItemStatus.Done;
        task.DueDate = null;
        task.UpdatedAt = Clock.UtcNow.AddHours(1);
        await _sut.UpdateAsync(task);

        var loaded = await _sut.GetByIdAsync(task.Id);
        loaded!.Title.Should().Be("Updated");
        loaded.Status.Should().Be(TaskItemStatus.Done);
        loaded.DueDate.Should().BeNull();
    }

    [Fact]
    public async Task Delete_RemovesTask()
    {
        var task = NewTask();
        await _sut.AddAsync(task);

        await _sut.DeleteAsync(task.Id);

        (await _sut.GetByIdAsync(task.Id)).Should().BeNull();
    }

    [Fact]
    public async Task GetByUser_WhenNone_ReturnsEmpty()
    {
        var result = await _sut.GetByUserAsync(Guid.NewGuid(), null, null);

        result.Should().BeEmpty();
    }
}
