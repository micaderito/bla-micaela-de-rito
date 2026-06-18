using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using TaskManager.Infrastructure.Configuration;

namespace TaskManager.Api.Authentication;

/// <summary>
/// Configures JWT bearer validation from the same <see cref="JwtOptions"/> used to
/// issue tokens, so the signing key is always resolved at runtime (and stays
/// consistent under configuration overrides, e.g. in tests).
/// </summary>
public sealed class ConfigureJwtBearerOptions(IOptions<JwtOptions> jwtOptions)
    : IConfigureNamedOptions<JwtBearerOptions>
{
    private readonly JwtOptions _jwt = jwtOptions.Value;

    public void Configure(string? name, JwtBearerOptions options) => Configure(options);

    public void Configure(JwtBearerOptions options)
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = _jwt.Issuer,
            ValidAudience = _jwt.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Secret)),
            ClockSkew = TimeSpan.FromSeconds(30)
        };
    }
}
