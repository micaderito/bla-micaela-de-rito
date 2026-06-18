using FluentAssertions;
using TaskManager.Infrastructure.Security;
using Xunit;

namespace TaskManager.Infrastructure.Tests.Security;

public class PasswordHasherTests
{
    private readonly PasswordHasher _sut = new();

    [Fact]
    public void Hash_ProducesVerifiableHash()
    {
        var hash = _sut.Hash("password123");

        _sut.Verify("password123", hash).Should().BeTrue();
    }

    [Fact]
    public void Hash_IsSaltedSoSamePasswordYieldsDifferentHashes()
    {
        _sut.Hash("password123").Should().NotBe(_sut.Hash("password123"));
    }

    [Fact]
    public void Verify_WithWrongPassword_ReturnsFalse()
    {
        var hash = _sut.Hash("password123");

        _sut.Verify("wrong-password", hash).Should().BeFalse();
    }

    [Theory]
    [InlineData("")]
    [InlineData("not-a-valid-hash")]
    [InlineData("1.notbase64.notbase64")]
    public void Verify_WithMalformedHash_ReturnsFalse(string hash)
    {
        _sut.Verify("password123", hash).Should().BeFalse();
    }

    [Fact]
    public void Hash_WithEmptyPassword_Throws()
    {
        var act = () => _sut.Hash("  ");

        act.Should().Throw<ArgumentException>();
    }
}
