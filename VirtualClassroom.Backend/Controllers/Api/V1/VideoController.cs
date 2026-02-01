using System.Security.Claims;
using Asp.Versioning;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VirtualClassroom.Application.Video.GetLiveKitToken;

namespace VirtualClassroom.Api.Controllers.Api.V1;

[ApiController]
[Route("api/v{version:apiVersion}/[controller]")]
[ApiVersion("1.0")]
[Authorize]
public class VideoController(IMediator mediator) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? throw new UnauthorizedAccessException();
    private string Username => User.FindFirstValue(ClaimTypes.Name) ?? User.FindFirstValue("unique_name") ?? "User";

    [HttpPost("livekit-token")]
    public async Task<IActionResult> GetLiveKitToken([FromBody] LiveKitTokenRequest request, CancellationToken ct)
    {
        var query = new GetLiveKitTokenQuery(UserId, Username, request.RoomCode, request.CanPublish, request.CanSubscribe);
        var token = await mediator.Send(query, ct);
        return Ok(new { token, roomName = request.RoomCode });
    }
}

public record LiveKitTokenRequest(string RoomCode, bool CanPublish = true, bool CanSubscribe = true);
