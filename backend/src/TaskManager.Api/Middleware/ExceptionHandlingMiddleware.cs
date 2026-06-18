using System.Net;
using Microsoft.AspNetCore.Mvc;
using TaskManager.Application.Common;

namespace TaskManager.Api.Middleware;

/// <summary>
/// Translates Application-layer exceptions into consistent ProblemDetails JSON
/// responses, keeping controllers free of try/catch noise.
/// </summary>
public sealed class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            var (status, title) = Map(ex);

            if (status == HttpStatusCode.InternalServerError)
                logger.LogError(ex, "Unhandled exception");
            else
                logger.LogInformation("Handled {Exception}: {Message}", ex.GetType().Name, ex.Message);

            var problem = new ProblemDetails
            {
                Status = (int)status,
                Title = title,
                Detail = status == HttpStatusCode.InternalServerError
                    ? "An unexpected error occurred."
                    : ex.Message
            };

            context.Response.StatusCode = problem.Status.Value;
            context.Response.ContentType = "application/problem+json";
            await context.Response.WriteAsJsonAsync(problem);
        }
    }

    private static (HttpStatusCode Status, string Title) Map(Exception ex) => ex switch
    {
        ValidationException => (HttpStatusCode.BadRequest, "Validation failed"),
        AuthenticationException => (HttpStatusCode.Unauthorized, "Authentication failed"),
        ForbiddenException => (HttpStatusCode.Forbidden, "Forbidden"),
        NotFoundException => (HttpStatusCode.NotFound, "Not found"),
        ConflictException => (HttpStatusCode.Conflict, "Conflict"),
        _ => (HttpStatusCode.InternalServerError, "Server error")
    };
}
