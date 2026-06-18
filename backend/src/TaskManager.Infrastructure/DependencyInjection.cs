using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TaskManager.Application.Abstractions;
using TaskManager.Domain.Repositories;
using TaskManager.Infrastructure.Configuration;
using TaskManager.Infrastructure.Persistence;
using TaskManager.Infrastructure.Security;
using TaskManager.Infrastructure.Time;

namespace TaskManager.Infrastructure;

public static class DependencyInjection
{
    /// <summary>Registers data access, security and time services of the Infrastructure layer.</summary>
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));

        var connectionString = configuration.GetConnectionString("Default")
                               ?? "Data Source=taskmanager.db";
        services.AddSingleton<ISqliteConnectionFactory>(_ => new SqliteConnectionFactory(connectionString));

        services.AddSingleton<IClock, SystemClock>();
        services.AddSingleton<IPasswordHasher, PasswordHasher>();
        services.AddSingleton<ITokenGenerator, JwtTokenGenerator>();

        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<ITaskRepository, TaskRepository>();

        services.AddSingleton<DatabaseInitializer>();

        return services;
    }
}
