using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace TaskManager.Api.Tests.Integration;

/// <summary>
/// Boots the real API pipeline against an isolated shared-cache in-memory SQLite
/// database, so integration tests exercise routing, auth, middleware and the
/// ADO.NET data layer together without touching disk.
/// </summary>
public sealed class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _connectionString =
        $"Data Source=api-tests-{Guid.NewGuid():N};Mode=Memory;Cache=Shared";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Default"] = _connectionString,
                ["Jwt:Secret"] = "integration-test-signing-key-that-is-long-enough-123456",
                ["Jwt:Issuer"] = "TaskManager",
                ["Jwt:Audience"] = "TaskManagerClient",
                ["Jwt:ExpiryMinutes"] = "60"
            });
        });
    }
}
