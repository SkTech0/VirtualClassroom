using Microsoft.Extensions.Configuration;
using VirtualClassroom.Application.Common.Interfaces;
using VirtualClassroom.Infrastructure.Auth;

namespace VirtualClassroom.Tests.Unit.Infrastructure.Auth;

public sealed class InMemoryAuthTokenServiceTests
{
    private readonly IConfiguration _configuration;
    private readonly InMemoryAuthTokenService _sut;

    public InMemoryAuthTokenServiceTests()
    {
        _configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["JwtSettings:SecretKey"] = "test-secret-key-min-32-chars-for-hs256!!",
                ["JwtSettings:Issuer"] = "TestIssuer",
                ["JwtSettings:Audience"] = "TestAudience"
            })
            .Build();
        _sut = new InMemoryAuthTokenService(_configuration);
    }

    [Fact]
    public async Task GenerateTokensAsync_ReturnsAccessAndRefreshTokens()
    {
        var userId = Guid.NewGuid().ToString();
        var result = await _sut.GenerateTokensAsync(userId, "u@test.com", "user1", new List<string> { "Student" });

        result.Should().NotBeNull();
        result.AccessToken.Should().NotBeNullOrEmpty();
        result.RefreshToken.Should().NotBeNullOrEmpty();
        result.ExpiresInSeconds.Should().BePositive();
        result.ExpiresAt.Should().BeAfter(DateTime.UtcNow);
    }

    [Fact]
    public async Task RefreshTokenAsync_ValidToken_ReturnsNewTokens()
    {
        var userId = Guid.NewGuid().ToString();
        var first = await _sut.GenerateTokensAsync(userId, "u@test.com", "user1", new List<string> { "Student" });

        var refreshed = await _sut.RefreshTokenAsync(first.RefreshToken);

        refreshed.Should().NotBeNull();
        refreshed!.AccessToken.Should().NotBeNullOrEmpty();
        refreshed.RefreshToken.Should().NotBe(first.RefreshToken, "refresh token should be one-time use");
    }

    [Fact]
    public async Task RefreshTokenAsync_InvalidToken_ReturnsNull()
    {
        var result = await _sut.RefreshTokenAsync("invalid-token");
        result.Should().BeNull();
    }

    [Fact]
    public async Task RefreshTokenAsync_ReuseOfRefreshToken_ReturnsNull()
    {
        var first = await _sut.GenerateTokensAsync(Guid.NewGuid().ToString(), "u@test.com", "u", new List<string>());
        await _sut.RefreshTokenAsync(first.RefreshToken);

        var secondAttempt = await _sut.RefreshTokenAsync(first.RefreshToken);
        secondAttempt.Should().BeNull();
    }

    [Fact]
    public async Task RevokeTokenAsync_RemovesToken()
    {
        var first = await _sut.GenerateTokensAsync(Guid.NewGuid().ToString(), "u@test.com", "u", new List<string>());
        await _sut.RevokeTokenAsync(first.RefreshToken);

        var refreshed = await _sut.RefreshTokenAsync(first.RefreshToken);
        refreshed.Should().BeNull();
    }

    [Fact]
    public async Task RevokeAllUserTokensAsync_RemovesAllTokensForUser()
    {
        var userId = Guid.NewGuid().ToString();
        var t1 = await _sut.GenerateTokensAsync(userId, "u@test.com", "u", new List<string>());
        var t2 = await _sut.GenerateTokensAsync(userId, "u@test.com", "u", new List<string>());
        await _sut.RevokeAllUserTokensAsync(userId);

        (await _sut.RefreshTokenAsync(t1.RefreshToken)).Should().BeNull();
        (await _sut.RefreshTokenAsync(t2.RefreshToken)).Should().BeNull();
    }
}
