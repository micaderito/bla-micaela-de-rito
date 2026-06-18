namespace TaskManager.Infrastructure.Configuration;

/// <summary>Strongly-typed JWT settings bound from the "Jwt" configuration section.</summary>
public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Secret { get; set; } = string.Empty;
    public string Issuer { get; set; } = "TaskManager";
    public string Audience { get; set; } = "TaskManagerClient";
    public int ExpiryMinutes { get; set; } = 60;
}
