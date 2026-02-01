using MediatR;
using VirtualClassroom.Application.Common.Interfaces;

namespace VirtualClassroom.Application.Pomodoro.EndPomodoro;

public sealed class EndPomodoroCommandHandler(
    IPomodoroRepository pomodoroRepository,
    ISessionRepository sessionRepository)
    : IRequestHandler<EndPomodoroCommand, PomodoroResponse>
{
    public async Task<PomodoroResponse> Handle(EndPomodoroCommand request, CancellationToken ct)
    {
        var userId = Guid.Parse(request.UserId);
        var pomodoro = await pomodoroRepository.GetByIdAsync(request.PomodoroId, ct);
        if (pomodoro is null)
            throw new InvalidOperationException("Pomodoro not found");

        var session = await sessionRepository.GetByIdAsync(pomodoro.SessionId, ct);
        if (session is null || session.UserId != userId)
            throw new InvalidOperationException("Pomodoro not found");

        if (pomodoro.EndTime is not null)
            throw new InvalidOperationException("Pomodoro already ended");

        pomodoro.EndTime = request.EndTime;
        await pomodoroRepository.UpdateAsync(pomodoro, ct);

        return new PomodoroResponse(
            pomodoro.Id,
            pomodoro.SessionId,
            pomodoro.StartTime,
            pomodoro.EndTime,
            pomodoro.IsBreak);
    }
}
