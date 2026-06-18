using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace TaskManager.Api.Extensions;

public static class ClaimsPrincipalExtensions
{
    /// <summary>Reads the authenticated user's id from the JWT 'sub' claim.</summary>
    public static Guid GetUserId(this ClaimsPrincipal principal)
    {
        var value = principal.FindFirstValue(JwtRegisteredClaimNames.Sub)
                    ?? principal.FindFirstValue(ClaimTypes.NameIdentifier);

        return Guid.TryParse(value, out var id)
            ? id
            : throw new UnauthorizedAccessException("Token does not contain a valid user id.");
    }
}
