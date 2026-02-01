using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using StackExchange.Redis;
using VirtualClassroom.Application.Common.Interfaces;
using VirtualClassroom.Infrastructure.Identity;

namespace VirtualClassroom.Infrastructure.Auth;

public sealed class AuthTokenService(
    IConfiguration configuration,
    IConnectionMultiplexer redis,
    ILogger<AuthTokenService> logger) : IAuthTokenService
{
    private const string RefreshTokenPrefix = "refresh:";
    private const string UserTokensPrefix = "user_tokens:";
    private const int RefreshTokenExpiryDays = 7;
    private const int AccessTokenExpiryMinutes = 15;

    public async Task<AuthTokenResult> GenerateTokensAsync(string userId, string email, string username, IList<string> roles)
    {
        var accessToken = GenerateAccessToken(userId, email, username, roles);
        var refreshToken = GenerateRefreshToken();
        var expiresAt = DateTime.UtcNow.AddMinutes(AccessTokenExpiryMinutes);
        var expiresInSeconds = (int)(expiresAt - DateTime.UtcNow).TotalSeconds;

        var db = redis.GetDatabase();
        var refreshKey = $"{RefreshTokenPrefix}{refreshToken}";
        var refreshValue = System.Text.Json.JsonSerializer.Serialize(new RefreshTokenPayload(userId, email, username, roles.ToList()));
        await db.StringSetAsync(refreshKey, refreshValue, TimeSpan.FromDays(RefreshTokenExpiryDays));

        var userTokensKey = $"{UserTokensPrefix}{userId}";
        await db.SetAddAsync(userTokensKey, refreshToken);
        await db.KeyExpireAsync(userTokensKey, TimeSpan.FromDays(RefreshTokenExpiryDays + 1));

        return new AuthTokenResult(accessToken, refreshToken, expiresAt, expiresInSeconds);
    }

    public async Task<AuthTokenResult?> RefreshTokenAsync(string refreshToken)
    {
        var db = redis.GetDatabase();
        var key = $"{RefreshTokenPrefix}{refreshToken}";
        var payloadJson = await db.StringGetAsync(key);
        if (payloadJson.IsNullOrEmpty)
        {
            logger.LogWarning("Refresh token not found or expired");
            return null;
        }

        var payload = System.Text.Json.JsonSerializer.Deserialize<RefreshTokenPayload>(payloadJson!.ToString());
        if (payload is null)
            return null;

        await db.KeyDeleteAsync(key);

        var tokens = await GenerateTokensAsync(
            payload.UserId,
            payload.Email,
            payload.Username,
            payload.Roles.ToArray());

        return tokens;
    }

    public async Task RevokeTokenAsync(string refreshToken)
    {
        var db = redis.GetDatabase();
        var key = $"{RefreshTokenPrefix}{refreshToken}";
        var payloadJson = await db.StringGetAsync(key);
        if (!payloadJson.IsNullOrEmpty)
        {
            var payload = System.Text.Json.JsonSerializer.Deserialize<RefreshTokenPayload>(payloadJson!.ToString());
            if (payload is not null)
            {
                var userTokensKey = $"{UserTokensPrefix}{payload.UserId}";
                await db.SetRemoveAsync(userTokensKey, refreshToken);
            }
        }
        await db.KeyDeleteAsync(key);
    }

    public async Task RevokeAllUserTokensAsync(string userId)
    {
        var db = redis.GetDatabase();
        var userTokensKey = $"{UserTokensPrefix}{userId}";
        var tokens = await db.SetMembersAsync(userTokensKey);
        foreach (var token in tokens)
        {
            await db.KeyDeleteAsync($"{RefreshTokenPrefix}{token}");
        }
        await db.KeyDeleteAsync(userTokensKey);
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
