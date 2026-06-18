using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskManager.Api.Extensions;
using TaskManager.Application.DTOs;
using TaskManager.Application.Services;

namespace TaskManager.Api.Controllers;

/// <summary>
/// User/identity API: registration and login are anonymous; <c>me</c> requires a
/// valid token, while <c>public</c> demonstrates a deliberately unauthenticated endpoint.
/// </summary>
[ApiController]
[Route("api/auth")]
public class AuthController(IAuthService authService) : ControllerBase
{
    [HttpPost("register")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(AuthResultDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AuthResultDto>> Register(RegisterDto dto, CancellationToken ct)
    {
        var result = await authService.RegisterAsync(dto, ct);
        return CreatedAtAction(nameof(Me), result);
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(AuthResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AuthResultDto>> Login(LoginDto dto, CancellationToken ct)
    {
        var result = await authService.LoginAsync(dto, ct);
        return Ok(result);
    }

    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<UserDto>> Me(CancellationToken ct)
    {
        var user = await authService.GetCurrentUserAsync(User.GetUserId(), ct);
        return Ok(user);
    }

    /// <summary>Public, unauthenticated health/info endpoint (demonstrates the contrast).</summary>
    [HttpGet("public")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public ActionResult<object> Public() =>
        Ok(new { message = "Task Manager API is up. This endpoint requires no authentication." });
}
