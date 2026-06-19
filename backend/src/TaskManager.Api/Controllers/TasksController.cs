using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskManager.Api.Extensions;
using TaskManager.Application.DTOs;
using TaskManager.Application.Services;
using static TaskManager.Application.DTOs.DueDatePreset;

namespace TaskManager.Api.Controllers;

/// <summary>
/// CRUD API for the authenticated user's tasks. Every endpoint requires a valid
/// JWT; tasks are always scoped to the caller.
/// </summary>
[ApiController]
[Route("api/tasks")]
[Authorize]
public class TasksController(ITaskService taskService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<TaskDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<TaskDto>>> GetAll(
        [FromQuery] DueDatePreset? dueDatePreset,
        [FromQuery] DateTime? dueDateFrom,
        [FromQuery] DateTime? dueDateTo,
        CancellationToken ct)
        => Ok(await taskService.GetTasksAsync(User.GetUserId(), dueDatePreset, dueDateFrom, dueDateTo, ct));

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(TaskDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<TaskDto>> GetById(Guid id, CancellationToken ct)
        => Ok(await taskService.GetTaskAsync(User.GetUserId(), id, ct));

    [HttpPost]
    [ProducesResponseType(typeof(TaskDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<TaskDto>> Create(CreateTaskDto dto, CancellationToken ct)
    {
        var created = await taskService.CreateTaskAsync(User.GetUserId(), dto, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(TaskDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<TaskDto>> Update(Guid id, UpdateTaskDto dto, CancellationToken ct)
        => Ok(await taskService.UpdateTaskAsync(User.GetUserId(), id, dto, ct));

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await taskService.DeleteTaskAsync(User.GetUserId(), id, ct);
        return NoContent();
    }
}
