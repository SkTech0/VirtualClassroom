namespace VirtualClassroom.Application.Common.Interfaces;

public interface IAuthTokenService
{
    Task<AuthTokenResult> GenerateTokensAsync(string userId, string email, string username, IList<string> roles);
    Task<AuthTokenResult?> RefreshTokenAsync(string refreshToken);
    Task RevokeTokenAsync(string refreshToken);
    Task RevokeAllUserTokensAsync(string userId);
}

public record AuthTokenResult(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAt,
    int ExpiresInSeconds);
