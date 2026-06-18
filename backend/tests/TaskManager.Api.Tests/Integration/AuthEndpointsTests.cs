using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using FluentAssertions;
using TaskManager.Application.DTOs;
using Xunit;

namespace TaskManager.Api.Tests.Integration;

public class AuthEndpointsTests(CustomWebApplicationFactory factory)
    : IClassFixture<CustomWebApplicationFactory>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    private readonly HttpClient _client = factory.CreateClient();

    private static RegisterDto NewUser() =>
        new($"user{Guid.NewGuid():N}"[..12], $"{Guid.NewGuid():N}@example.com", "password123");

    [Fact]
    public async Task Public_IsReachableWithoutAuth()
    {
        var response = await _client.GetAsync("/api/auth/public");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Register_WithValidData_Returns201AndToken()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/register", NewUser());

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var result = await response.Content.ReadFromJsonAsync<AuthResultDto>(Json);
        result!.Token.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Register_DuplicateUsername_Returns409()
    {
        var user = NewUser();
        await _client.PostAsJsonAsync("/api/auth/register", user);

        var dup = user with { Email = $"{Guid.NewGuid():N}@example.com" };
        var response = await _client.PostAsJsonAsync("/api/auth/register", dup);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Register_InvalidData_Returns400()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/register",
            new RegisterDto("ab", "bad-email", "short"));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Login_WithWrongPassword_Returns401()
    {
        var user = NewUser();
        await _client.PostAsJsonAsync("/api/auth/register", user);

        var response = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginDto(user.Username, "wrong-password"));

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Me_WithoutToken_Returns401()
    {
        var response = await _client.GetAsync("/api/auth/me");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Me_WithToken_ReturnsCurrentUser()
    {
        var user = NewUser();
        var auth = await RegisterAndAuth(user);
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new("Bearer", auth.Token);

        var me = await client.GetFromJsonAsync<UserDto>("/api/auth/me", Json);

        me!.Username.Should().Be(user.Username);
    }

    private async Task<AuthResultDto> RegisterAndAuth(RegisterDto user)
    {
        var response = await _client.PostAsJsonAsync("/api/auth/register", user);
        return (await response.Content.ReadFromJsonAsync<AuthResultDto>(Json))!;
    }
}
