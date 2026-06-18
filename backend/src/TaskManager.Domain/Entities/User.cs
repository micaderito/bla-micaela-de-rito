namespace TaskManager.Domain.Entities;

/// <summary>
/// An application user. Credentials are never stored in plain text; only the
/// <see cref="PasswordHash"/> is persisted.
/// </summary>
public class User
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
