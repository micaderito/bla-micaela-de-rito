using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using FluentAssertions;
using TaskManager.Application.DTOs;
using TaskManager.Domain.Enums;
using Xunit;

namespace TaskManager.Api.Tests.Integration;

public class TaskEndpointsTests(CustomWebApplicationFactory factory)
    : IClassFixture<CustomWebApplicationFactory>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    private readonly CustomWebApplicationFactory _factory = factory;

    /// <summary>Creates a fresh user and returns an authenticated client.</summary>
    private async Task<HttpClient> CreateAuthenticatedClientAsync()
    {
        var client = _factory.CreateClient();
        var register = new RegisterDto($"user{Guid.NewGuid():N}"[..12],
            $"{Guid.NewGuid():N}@example.com", "password123");
        var response = await client.PostAsJsonAsync("/api/auth/register", register);
        var auth = await response.Content.ReadFromJsonAsync<AuthResultDto>(Json);
        client.DefaultRequestHeaders.Authorization = new("Bearer", auth!.Token);
        return client;
    }

    [Fact]
    public async Task Tasks_WithoutToken_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/tasks");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Create_Get_Update_Delete_FullLifecycle()
    {
        var client = await CreateAuthenticatedClientAsync();

        // Create
        var create = new CreateTaskDto("Integration task", "desc", TaskItemStatus.Pending, null);
        var createResponse = await client.PostAsJsonAsync("/api/tasks", create);
        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await createResponse.Content.ReadFromJsonAsync<TaskDto>(Json);
        created!.Title.Should().Be("Integration task");

        // Get by id
        var fetched = await client.GetFromJsonAsync<TaskDto>($"/api/tasks/{created.Id}", Json);
        fetched!.Id.Should().Be(created.Id);

        // Update
        var update = new UpdateTaskDto("Updated", "new", TaskItemStatus.Done, null);
        var updateResponse = await client.PutAsJsonAsync($"/api/tasks/{created.Id}", update);
        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await updateResponse.Content.ReadFromJsonAsync<TaskDto>(Json);
        updated!.Status.Should().Be(TaskItemStatus.Done);

        // Delete
        var deleteResponse = await client.DeleteAsync($"/api/tasks/{created.Id}");
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Gone
        var goneResponse = await client.GetAsync($"/api/tasks/{created.Id}");
        goneResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Create_WithInvalidPayload_Returns400()
    {
        var client = await CreateAuthenticatedClientAsync();

        var response = await client.PostAsJsonAsync("/api/tasks",
            new CreateTaskDto("", null, TaskItemStatus.Pending, null));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Get_NonExistentTask_Returns404()
    {
        var client = await CreateAuthenticatedClientAsync();

        var response = await client.GetAsync($"/api/tasks/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Get_TaskOwnedByAnotherUser_Returns403()
    {
        var owner = await CreateAuthenticatedClientAsync();
        var createResponse = await owner.PostAsJsonAsync("/api/tasks",
            new CreateTaskDto("Private", null, TaskItemStatus.Pending, null));
        var created = await createResponse.Content.ReadFromJsonAsync<TaskDto>(Json);

        var intruder = await CreateAuthenticatedClientAsync();
        var response = await intruder.GetAsync($"/api/tasks/{created!.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task List_ReturnsOnlyCallersTasks()
    {
        var userA = await CreateAuthenticatedClientAsync();
        await userA.PostAsJsonAsync("/api/tasks",
            new CreateTaskDto("A-task", null, TaskItemStatus.Pending, null));

        var userB = await CreateAuthenticatedClientAsync();
        var listB = await userB.GetFromJsonAsync<List<TaskDto>>("/api/tasks", Json);

        listB.Should().NotContain(t => t.Title == "A-task");
    }
}
