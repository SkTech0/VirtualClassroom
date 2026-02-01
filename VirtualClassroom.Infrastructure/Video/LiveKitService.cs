using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using VirtualClassroom.Application.Common.Interfaces;

namespace VirtualClassroom.Infrastructure.Video;

public sealed class LiveKitService(IConfiguration configuration) : ILiveKitService
{
    public string GenerateAccessToken(string roomName, string participantIdentity, string participantName, bool canPublish = true, bool canSubscribe = true)
    {
        var liveKit = configuration.GetSection("LiveKit");
        var apiKey = liveKit["ApiKey"] ?? throw new InvalidOperationException("LiveKit:ApiKey not configured");
        var apiSecret = liveKit["ApiSecret"] ?? throw new InvalidOperationException("LiveKit:ApiSecret not configured");

        var videoGrant = new Dictionary<string, object>
        {
            ["roomJoin"] = true,
            ["room"] = roomName,
            ["canPublish"] = canPublish,
            ["canSubscribe"] = canSubscribe,
            ["canPublishData"] = true
        };

        var payload = new Dictionary<string, object>
        {
            ["sub"] = participantIdentity,
            ["name"] = participantName,
            ["video"] = videoGrant,
            ["iss"] = apiKey,
            ["nbf"] = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
            ["exp"] = DateTimeOffset.UtcNow.AddHours(1).ToUnixTimeSeconds()
        };

        var header = new Dictionary<string, string>
        {
            ["alg"] = "HS256",
            ["typ"] = "JWT"
        };

        var headerBase64 = Base64UrlEncode(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(header)));
        var payloadBase64 = Base64UrlEncode(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(payload)));
        var signingInput = $"{headerBase64}.{payloadBase64}";

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(apiSecret));
        var signature = hmac.ComputeHash(Encoding.UTF8.GetBytes(signingInput));
        var signatureBase64 = Base64UrlEncode(signature);

        return $"{signingInput}.{signatureBase64}";
    }

    private static string Base64UrlEncode(byte[] input)
    {
        return Convert.ToBase64String(input)
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');
    }
}
