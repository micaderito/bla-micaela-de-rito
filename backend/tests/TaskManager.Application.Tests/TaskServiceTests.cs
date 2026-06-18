using FluentAssertions;
using Moq;
using TaskManager.Application.Common;
using TaskManager.Application.DTOs;
using TaskManager.Application.Services;
using TaskManager.Domain.Entities;
using TaskManager.Domain.Enums;
using TaskManager.Domain.Repositories;
using Xunit;

namespace TaskManager.Application.Tests;

public class TaskServiceTests
{
    private readonly Mock<ITaskRepository> _repo = new();
    private readonly FixedClock _clock = new(new DateTime(2026, 6, 16, 12, 0, 0, DateTimeKind.Utc));
    private readonly Guid _userId = Guid.NewGuid();
    private readonly TaskService _sut;

    public TaskServiceTests() => _sut = new TaskService(_repo.Object, _clock);

    private TaskItem OwnedTask(Guid? id = null) => new()
    {
        Id = id ?? Guid.NewGuid(),
        Title = "Existing",
        Status = TaskItemStatus.Pending,
        UserId = _userId,
        CreatedAt = _clock.UtcNow,
        UpdatedAt = _clock.UtcNow
    };

    [Fact]
    public async Task GetTasks_ReturnsMappedTasksForUser()
    {
        var tasks = new List<TaskItem> { OwnedTask(), OwnedTask() };
        _repo.Setup(r => r.GetByUserAsync(_userId, It.IsAny<CancellationToken>())).ReturnsAsync(tasks);

        var result = await _sut.GetTasksAsync(_userId);

        result.Should().HaveCount(2);
        _repo.Verify(r => r.GetByUserAsync(_userId, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetTask_WhenOwned_ReturnsDto()
    {
        var task = OwnedTask();
        _repo.Setup(r => r.GetByIdAsync(task.Id, It.IsAny<CancellationToken>())).ReturnsAsync(task);

        var result = await _sut.GetTaskAsync(_userId, task.Id);

        result.Id.Should().Be(task.Id);
    }

    [Fact]
    public async Task GetTask_WhenMissing_ThrowsNotFound()
    {
        _repo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TaskItem?)null);

        var act = () => _sut.GetTaskAsync(_userId, Guid.NewGuid());

        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task GetTask_WhenOwnedByAnother_ThrowsForbidden()
    {
        var task = OwnedTask();
        task.UserId = Guid.NewGuid();
        _repo.Setup(r => r.GetByIdAsync(task.Id, It.IsAny<CancellationToken>())).ReturnsAsync(task);

        var act = () => _sut.GetTaskAsync(_userId, task.Id);

        await act.Should().ThrowAsync<ForbiddenException>();
    }

    [Fact]
    public async Task CreateTask_PersistsAndReturnsDto()
    {
        var dto = new CreateTaskDto("  New task  ", "  details  ", TaskItemStatus.InProgress,
            _clock.UtcNow.AddDays(2));

        var result = await _sut.CreateTaskAsync(_userId, dto);

        result.Title.Should().Be("New task");
        result.Description.Should().Be("details");
        result.Status.Should().Be(TaskItemStatus.InProgress);
        _repo.Verify(r => r.AddAsync(
            It.Is<TaskItem>(t => t.UserId == _userId && t.Title == "New task" && t.Id != Guid.Empty),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateTask_BlankDescription_IsStoredAsNull()
    {
        var dto = new CreateTaskDto("Title", "   ", TaskItemStatus.Pending, null);

        var result = await _sut.CreateTaskAsync(_userId, dto);

        result.Description.Should().BeNull();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task CreateTask_EmptyTitle_ThrowsValidation(string title)
    {
        var dto = new CreateTaskDto(title, null, TaskItemStatus.Pending, null);

        var act = () => _sut.CreateTaskAsync(_userId, dto);

        await act.Should().ThrowAsync<ValidationException>();
        _repo.Verify(r => r.AddAsync(It.IsAny<TaskItem>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateTask_TitleTooLong_ThrowsValidation()
    {
        var dto = new CreateTaskDto(new string('a', TaskService.TitleMaxLength + 1), null,
            TaskItemStatus.Pending, null);

        await FluentActions.Awaiting(() => _sut.CreateTaskAsync(_userId, dto))
            .Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task CreateTask_PastDueDate_ThrowsValidation()
    {
        var dto = new CreateTaskDto("Title", null, TaskItemStatus.Pending, _clock.UtcNow.AddDays(-1));

        await FluentActions.Awaiting(() => _sut.CreateTaskAsync(_userId, dto))
            .Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task CreateTask_InvalidStatus_ThrowsValidation()
    {
        var dto = new CreateTaskDto("Title", null, (TaskItemStatus)99, null);

        await FluentActions.Awaiting(() => _sut.CreateTaskAsync(_userId, dto))
            .Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task UpdateTask_WhenOwned_UpdatesFields()
    {
        var task = OwnedTask();
        _repo.Setup(r => r.GetByIdAsync(task.Id, It.IsAny<CancellationToken>())).ReturnsAsync(task);
        _clock.UtcNow = _clock.UtcNow.AddHours(1);
        var dto = new UpdateTaskDto("Updated", "new desc", TaskItemStatus.Done, null);

        var result = await _sut.UpdateTaskAsync(_userId, task.Id, dto);

        result.Title.Should().Be("Updated");
        result.Status.Should().Be(TaskItemStatus.Done);
        result.UpdatedAt.Should().Be(_clock.UtcNow);
        _repo.Verify(r => r.UpdateAsync(It.IsAny<TaskItem>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task UpdateTask_AllowsPastDueDate()
    {
        var task = OwnedTask();
        _repo.Setup(r => r.GetByIdAsync(task.Id, It.IsAny<CancellationToken>())).ReturnsAsync(task);
        var dto = new UpdateTaskDto("Updated", null, TaskItemStatus.Done, _clock.UtcNow.AddDays(-5));

        var result = await _sut.UpdateTaskAsync(_userId, task.Id, dto);

        result.DueDate.Should().Be(dto.DueDate);
    }

    [Fact]
    public async Task UpdateTask_WhenOwnedByAnother_ThrowsForbidden()
    {
        var task = OwnedTask();
        task.UserId = Guid.NewGuid();
        _repo.Setup(r => r.GetByIdAsync(task.Id, It.IsAny<CancellationToken>())).ReturnsAsync(task);
        var dto = new UpdateTaskDto("Updated", null, TaskItemStatus.Done, null);

        await FluentActions.Awaiting(() => _sut.UpdateTaskAsync(_userId, task.Id, dto))
            .Should().ThrowAsync<ForbiddenException>();
        _repo.Verify(r => r.UpdateAsync(It.IsAny<TaskItem>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task DeleteTask_WhenOwned_CallsRepository()
    {
        var task = OwnedTask();
        _repo.Setup(r => r.GetByIdAsync(task.Id, It.IsAny<CancellationToken>())).ReturnsAsync(task);

        await _sut.DeleteTaskAsync(_userId, task.Id);

        _repo.Verify(r => r.DeleteAsync(task.Id, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DeleteTask_WhenMissing_ThrowsNotFound()
    {
        _repo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TaskItem?)null);

        await FluentActions.Awaiting(() => _sut.DeleteTaskAsync(_userId, Guid.NewGuid()))
            .Should().ThrowAsync<NotFoundException>();
    }
}
