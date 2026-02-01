using System.Collections.Concurrent;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using VirtualClassroom.Application.Common.Interfaces;

namespace VirtualClassroom.Infrastructure.Auth;

public sealed class InMemoryAuthTokenService(IConfiguration configuration) : IAuthTokenService
{
    private static readonly ConcurrentDictionary<string, RefreshTokenPayload> _refreshTokens = new();
    private const int RefreshTokenExpiryDays = 7;
    private const int AccessTokenExpiryMinutes = 15;

    public Task<AuthTokenResult> GenerateTokensAsync(string userId, string email, string username, IList<string> roles)
    {
        var accessToken = GenerateAccessToken(userId, email, username, roles);
        var refreshToken = GenerateRefreshToken();
        var expiresAt = DateTime.UtcNow.AddMinutes(AccessTokenExpiryMinutes);
        var expiresInSeconds = (int)(expiresAt - DateTime.UtcNow).TotalSeconds;

        _refreshTokens[refreshToken] = new RefreshTokenPayload(userId, email, username, roles.ToList());

        return Task.FromResult(new AuthTokenResult(accessToken, refreshToken, expiresAt, expiresInSeconds));
    }

    public Task<AuthTokenResult?> RefreshTokenAsync(string refreshToken)
    {
        if (!_refreshTokens.TryRemove(refreshToken, out var payload))
            return Task.FromResult<AuthTokenResult?>(null);

        return Task.FromResult<AuthTokenResult?>(
            GenerateTokensAsync(payload.UserId, payload.Email, payload.Username, payload.Roles.ToArray()).Result);
    }

    public Task RevokeTokenAsync(string refreshToken)
    {
        _refreshTokens.TryRemove(refreshToken, out _);
        return Task.CompletedTask;
    }

    public Task RevokeAllUserTokensAsync(string userId)
    {
        foreach (var kvp in _refreshTokens.Where(x => x.Value.UserId == userId).ToList())
            _refreshTokens.TryRemove(kvp.Key, out _);
        return Task.CompletedTask;
    }

    private string GenerateAccessToken(string userId, string email, string username, IList<string> roles)
    {
        var jwtSettings = configuration.GetSection("JwtSettings");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["SecretKey"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId),
            new(JwtRegisteredClaimNames.Email, email),
            new(JwtRegisteredClaimNames.UniqueName, username),
            new(ClaimTypes.NameIdentifier, userId)
        };

        foreach (var role in roles)
            claims.Add(new Claim(ClaimTypes.Role, role));

        var token = new JwtSecurityToken(
            issuer: jwtSettings["Issuer"],
            audience: jwtSettings["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(AccessTokenExpiryMinutes),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string GenerateRefreshToken()
    {
        var bytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes);
    }

    private record RefreshTokenPayload(string UserId, string Email, string Username, List<string> Roles);
}
