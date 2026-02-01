using MediatR;
using VirtualClassroom.Application.Auth;
using VirtualClassroom.Application.Common.Interfaces;

namespace VirtualClassroom.Application.Auth.Refresh;

public sealed class RefreshTokenCommandHandler(
    IAuthTokenService tokenService,
    IIdentityService identityService)
    : IRequestHandler<RefreshTokenCommand, AuthResponse>
{
    public async Task<AuthResponse> Handle(RefreshTokenCommand request, CancellationToken ct)
    {
        var result = await tokenService.RefreshTokenAsync(request.RefreshToken);
        if (result is null)
            throw new UnauthorizedAccessException("Invalid or expired refresh token");

        var userId = ExtractUserIdFromToken(result.AccessToken);
        if (userId is null)
            throw new UnauthorizedAccessException("Unable to extract user from token");

        var userInfo = await identityService.GetUserInfoAsync(userId);
        if (userInfo is null)
            throw new UnauthorizedAccessException("User not found");

        return new AuthResponse(
            result.AccessToken,
            result.RefreshToken,
            result.ExpiresInSeconds,
            result.ExpiresAt,
            userInfo.Username,
            userInfo.Email,
            userInfo.Roles.FirstOrDefault() ?? "Student");
    }

    private static string? ExtractUserIdFromToken(string accessToken)
    {
        var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
        var token = handler.ReadJwtToken(accessToken);
        return token.Claims.FirstOrDefault(c => c.Type == "sub")?.Value;
    }
}
