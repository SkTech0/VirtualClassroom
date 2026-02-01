using System.Security.Claims;
using Asp.Versioning;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VirtualClassroom.Application.Pomodoro;
using VirtualClassroom.Application.Pomodoro.EndPomodoro;
using VirtualClassroom.Application.Pomodoro.GetPomodoros;
using VirtualClassroom.Application.Pomodoro.StartPomodoro;

namespace VirtualClassroom.Api.Controllers.Api.V1;

[ApiController]
[Route("api/v{version:apiVersion}/[controller]")]
[ApiVersion("1.0")]
[Authorize]
public class PomodoroController(IMediator mediator) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? throw new UnauthorizedAccessException();

    [HttpPost("start")]
    public async Task<IActionResult> Start([FromBody] StartPomodoroRequest request, CancellationToken ct)
    {
        var command = new StartPomodoroCommand(UserId, request.SessionId, request.IsBreak);
        var response = await mediator.Send(command, ct);
        return Ok(response);
    }

    [HttpPost("end")]
    public async Task<IActionResult> End([FromBody] EndPomodoroRequest request, CancellationToken ct)
    {
        var command = new EndPomodoroCommand(UserId, request.PomodoroId, request.EndTime);
        var response = await mediator.Send(command, ct);
        return Ok(response);
    }

    [HttpGet("session/{sessionId:guid}")]
    public async Task<IActionResult> GetBySession(Guid sessionId, CancellationToken ct)
    {
        var query = new GetPomodorosBySessionQuery(sessionId);
        var response = await mediator.Send(query, ct);
        return Ok(response);
    }
}

public record StartPomodoroRequest(Guid SessionId, bool IsBreak);
public record EndPomodoroRequest(Guid PomodoroId, DateTime EndTime);
