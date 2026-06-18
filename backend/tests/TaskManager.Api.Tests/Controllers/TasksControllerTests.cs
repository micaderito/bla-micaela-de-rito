using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using TaskManager.Api.Controllers;
using TaskManager.Application.DTOs;
using TaskManager.Application.Services;
using TaskManager.Domain.Enums;
using Xunit;

namespace TaskManager.Api.Tests.Controllers;

public class TasksControllerTests
{
    private readonly Mock<ITaskService> _service = new();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly TasksController _sut;

    public TasksControllerTests()
    {
        _sut = new TasksController(_service.Object);
        var identity = new ClaimsIdentity([new Claim(JwtRegisteredClaimNames.Sub, _userId.ToString())]);
        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
        };
    }

    private static TaskDto Sample(Guid id) =>
        new(id, "t", null, TaskItemStatus.Pending, null, DateTime.UtcNow, DateTime.UtcNow);

    [Fact]
    public async Task GetAll_ReturnsOkWithCallersTasks()
    {
        _service.Setup(s => s.GetTasksAsync(_userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync([Sample(Guid.NewGuid())]);

        var result = await _sut.GetAll(CancellationToken.None);

        result.Result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task GetById_PassesUserAndIdToService()
    {
        var id = Guid.NewGuid();
        _service.Setup(s => s.GetTaskAsync(_userId, id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Sample(id));

        var result = await _sut.GetById(id, CancellationToken.None);

        result.Result.Should().BeOfType<OkObjectResult>();
        _service.Verify(s => s.GetTaskAsync(_userId, id, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Create_Returns201CreatedAtAction()
    {
        var id = Guid.NewGuid();
        _service.Setup(s => s.CreateTaskAsync(_userId, It.IsAny<CreateTaskDto>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Sample(id));

        var result = await _sut.Create(
            new CreateTaskDto("t", null, TaskItemStatus.Pending, null), CancellationToken.None);

        var created = result.Result.Should().BeOfType<CreatedAtActionResult>().Subject;
        created.RouteValues!["id"].Should().Be(id);
    }

    [Fact]
    public async Task Update_ReturnsOk()
    {
        var id = Guid.NewGuid();
        _service.Setup(s => s.UpdateTaskAsync(_userId, id, It.IsAny<UpdateTaskDto>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Sample(id));

        var result = await _sut.Update(id,
            new UpdateTaskDto("t", null, TaskItemStatus.Done, null), CancellationToken.None);

        result.Result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task Delete_Returns204AndCallsService()
    {
        var id = Guid.NewGuid();

        var result = await _sut.Delete(id, CancellationToken.None);

        result.Should().BeOfType<NoContentResult>();
        _service.Verify(s => s.DeleteTaskAsync(_userId, id, It.IsAny<CancellationToken>()), Times.Once);
    }
}
