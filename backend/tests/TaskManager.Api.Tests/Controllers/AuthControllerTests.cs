using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using TaskManager.Api.Controllers;
using TaskManager.Application.DTOs;
using TaskManager.Application.Services;
using Xunit;

namespace TaskManager.Api.Tests.Controllers;

public class AuthControllerTests
{
    private readonly Mock<IAuthService> _service = new();
    private readonly AuthController _sut;
    private readonly Guid _userId = Guid.NewGuid();

    public AuthControllerTests()
    {
        _sut = new AuthController(_service.Object);
        var identity = new ClaimsIdentity([new Claim(JwtRegisteredClaimNames.Sub, _userId.ToString())]);
        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
        };
    }

    [Fact]
    public async Task Register_Returns201Created()
    {
        var auth = new AuthResultDto("token", DateTime.UtcNow,
            new UserDto(_userId, "alice", "a@b.com", DateTime.UtcNow));
        _service.Setup(s => s.RegisterAsync(It.IsAny<RegisterDto>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(auth);

        var result = await _sut.Register(new RegisterDto("alice", "a@b.com", "password123"), CancellationToken.None);

        result.Result.Should().BeOfType<CreatedAtActionResult>();
    }

    [Fact]
    public async Task Login_ReturnsOkWithToken()
    {
        var auth = new AuthResultDto("token", DateTime.UtcNow,
            new UserDto(_userId, "alice", "a@b.com", DateTime.UtcNow));
        _service.Setup(s => s.LoginAsync(It.IsAny<LoginDto>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(auth);

        var result = await _sut.Login(new LoginDto("alice", "password123"), CancellationToken.None);

        var ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().Be(auth);
    }

    [Fact]
    public async Task Me_UsesUserIdFromClaims()
    {
        _service.Setup(s => s.GetCurrentUserAsync(_userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new UserDto(_userId, "alice", "a@b.com", DateTime.UtcNow));

        var result = await _sut.Me(CancellationToken.None);

        result.Result.Should().BeOfType<OkObjectResult>();
        _service.Verify(s => s.GetCurrentUserAsync(_userId, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public void Public_ReturnsOk()
    {
        var result = _sut.Public();

        result.Result.Should().BeOfType<OkObjectResult>();
    }
}
