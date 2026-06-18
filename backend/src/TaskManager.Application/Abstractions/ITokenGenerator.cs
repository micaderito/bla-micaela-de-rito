using TaskManager.Domain.Entities;

namespace TaskManager.Application.Abstractions;

/// <summary>Issues authentication tokens for users. Implemented in Infrastructure.</summary>
public interface ITokenGenerator
{
    /// <summary>Creates a signed JWT and returns the token plus its UTC expiry.</summary>
    (string Token, DateTime ExpiresAtUtc) CreateToken(User user);
}
