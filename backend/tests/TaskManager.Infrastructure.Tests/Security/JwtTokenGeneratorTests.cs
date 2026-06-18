using System.IdentityModel.Tokens.Jwt;
using FluentAssertions;
using Microsoft.Extensions.Options;
using TaskManager.Domain.Entities;
using TaskManager.Infrastructure.Configuration;
using TaskManager.Infrastructure.Security;
using Xunit;

namespace TaskManager.Infrastructure.Tests.Security;

public class JwtTokenGeneratorTests
{
    private readonly JwtOptions _options = new()
    {
        Secret = "super-secret-signing-key-that-is-long-enough-1234567890",
        Issuer = "TestIssuer",
        Audience = "TestAudience",
        ExpiryMinutes = 30
    };

    private JwtTokenGenerator CreateSut() => new(Options.Create(_options));

    [Fact]
    public void CreateToken_EmbedsUserClaims()
    {
        var user = new User { Id = Guid.NewGuid(), Username = "alice", Email = "alice@example.com" };

        var (token, expiresAt) = CreateSut().CreateToken(user);

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        jwt.Issuer.Should().Be("TestIssuer");
        jwt.Audiences.Should().Contain("TestAudience");
        jwt.Subject.Should().Be(user.Id.ToString());
        jwt.Claims.Should().Contain(c => c.Type == JwtRegisteredClaimNames.Email && c.Value == "alice@example.com");
        expiresAt.Should().BeCloseTo(DateTime.UtcNow.AddMinutes(30), TimeSpan.FromMinutes(1));
    }

    [Fact]
    public void CreateToken_ProducesUniqueTokensPerCall()
    {
        var user = new User { Id = Guid.NewGuid(), Username = "alice", Email = "a@b.com" };
        var sut = CreateSut();

        sut.CreateToken(user).Token.Should().NotBe(sut.CreateToken(user).Token);
    }
}
