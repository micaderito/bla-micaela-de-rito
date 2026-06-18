using Microsoft.Extensions.DependencyInjection;
using TaskManager.Application.Services;

namespace TaskManager.Application;

public static class DependencyInjection
{
    /// <summary>Registers the business-logic services of the Application layer.</summary>
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<ITaskService, TaskService>();
        services.AddScoped<IAuthService, AuthService>();
        return services;
    }
}
