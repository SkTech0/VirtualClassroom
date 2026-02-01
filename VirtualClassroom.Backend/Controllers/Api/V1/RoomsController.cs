using System.Security.Claims;
using Asp.Versioning;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using VirtualClassroom.Api.Hubs;
using VirtualClassroom.Application.Rooms;
using VirtualClassroom.Application.Rooms.CreateRoom;
using VirtualClassroom.Application.Rooms.GetParticipants;
using VirtualClassroom.Application.Rooms.GetRoom;
using VirtualClassroom.Application.Rooms.JoinRoom;
using VirtualClassroom.Application.Rooms.LeaveRoom;

namespace VirtualClassroom.Api.Controllers.Api.V1;

[ApiController]
[Route("api/v{version:apiVersion}/[controller]")]
[ApiVersion("1.0")]
[Authorize]
public class RoomsController(IMediator mediator, IHubContext<RoomHub> hubContext) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? throw new UnauthorizedAccessException();

    [HttpPost("create")]
    public async Task<IActionResult> Create([FromBody] CreateRoomRequest request, CancellationToken ct)
    {
        var command = new CreateRoomCommand(UserId, request.Subject);
        var response = await mediator.Send(command, ct);
        return Ok(response);
    }

    [HttpPost("join")]
    public async Task<IActionResult> Join([FromBody] JoinRoomRequest request, CancellationToken ct)
    {
        var command = new JoinRoomCommand(UserId, request.Code);
        var response = await mediator.Send(command, ct);
        return Ok(response);
    }

    [HttpPost("leave")]
    public async Task<IActionResult> Leave([FromBody] LeaveRoomRequest request, CancellationToken ct)
    {
        var command = new LeaveRoomCommand(UserId, request.RoomCode);
        await mediator.Send(command, ct);
        return NoContent();
    }

    [HttpGet("{code}")]
    public async Task<IActionResult> GetByCode(string code, CancellationToken ct)
    {
        var query = new GetRoomByCodeQuery(code);
        var response = await mediator.Send(query, ct);
        return Ok(response);
    }

    [HttpGet("{code}/participants")]
    public async Task<IActionResult> GetParticipants(string code, CancellationToken ct)
    {
        var query = new GetRoomParticipantsQuery(code);
        var response = await mediator.Send(query, ct);
        return Ok(response);
    }

    [HttpPost("knock-knock")]
    public async Task<IActionResult> KnockKnock([FromBody] KnockKnockRequest request)
    {
        await hubContext.Clients.Group(request.RoomCode).SendAsync("KnockKnockReceived", request.TargetUserId, UserId);
        return Ok();
    }

    [HttpPost("reminder")]
    public async Task<IActionResult> SendReminder([FromBody] ReminderRequest request)
    {
        await hubContext.Clients.Group(request.RoomCode).SendAsync("ReminderReceived", request.Message);
        return Ok();
    }
}

public record CreateRoomRequest(string Subject);
public record JoinRoomRequest(string Code);
public record LeaveRoomRequest(string RoomCode);
public record KnockKnockRequest(string RoomCode, string TargetUserId);
public record ReminderRequest(string RoomCode, string Message);
