using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using VirtualClassroom.Application.Auth;
using VirtualClassroom.Application.Auth.Refresh;
using VirtualClassroom.Application.Common.Interfaces;

namespace VirtualClassroom.Tests.Unit.Application.Auth;

public sealed class RefreshTokenCommandHandlerTests
{
    private readonly Mock<IAuthTokenService> _tokenService;
    private readonly Mock<IIdentityService> _identityService;
    private readonly RefreshTokenCommandHandler _sut;

    public RefreshTokenCommandHandlerTests()
    {
        _tokenService = new Mock<IAuthTokenService>();
        _identityService = new Mock<IIdentityService>();
        _sut = new RefreshTokenCommandHandler(_tokenService.Object, _identityService.Object);
    }

    [Fact]
    public async Task Handle_ValidRefreshToken_ReturnsAuthResponse()
    {
        var userId = Guid.NewGuid().ToString();
        var accessTokenWithSub = CreateMinimalJwtWithSub(userId);
        _tokenService
            .Setup(x => x.RefreshTokenAsync("valid-refresh"))
            .ReturnsAsync(new AuthTokenResult(accessTokenWithSub, "new-refresh", DateTime.UtcNow.AddMinutes(15), 900));
        _identityService
            .Setup(x => x.GetUserInfoAsync(userId))
            .ReturnsAsync(new UserInfoDto("user1", "u@test.com", new List<string> { "Student" }));

        var result = await _sut.Handle(new RefreshTokenCommand("valid-refresh"), CancellationToken.None);

        result.Should().NotBeNull();
        result.AccessToken.Should().Be(accessTokenWithSub);
        result.Username.Should().Be("user1");
    }

    [Fact]
    public async Task Handle_InvalidRefreshToken_ThrowsUnauthorizedAccessException()
    {
        _tokenService.Setup(x => x.RefreshTokenAsync("invalid")).ReturnsAsync((AuthTokenResult?)null);

        var act = () => _sut.Handle(new RefreshTokenCommand("invalid"), CancellationToken.None);

        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Invalid or expired refresh token");
    }

    private static string CreateMinimalJwtWithSub(string userId)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("test-secret-key-min-32-chars-for-hs256!!"));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            claims: new[] { new Claim("sub", userId) },
            expires: DateTime.UtcNow.AddMinutes(15),
            signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
