using MediatR;
using VirtualClassroom.Application.Common.Interfaces;
using VirtualClassroom.Domain.Entities;

namespace VirtualClassroom.Application.Pomodoro.StartPomodoro;

public sealed class StartPomodoroCommandHandler(
    IPomodoroRepository pomodoroRepository,
    ISessionRepository sessionRepository)
    : IRequestHandler<StartPomodoroCommand, PomodoroResponse>
{
    public async Task<PomodoroResponse> Handle(StartPomodoroCommand request, CancellationToken ct)
    {
        var userId = Guid.Parse(request.UserId);
        var session = await sessionRepository.GetByIdAsync(request.SessionId, ct);
        if (session is null || session.UserId != userId || session.LeftAt is not null)
            throw new InvalidOperationException("Session not found or not active");

        var pomodoro = new Domain.Entities.Pomodoro
        {
            Id = Guid.NewGuid(),
            SessionId = session.Id,
            StartTime = DateTime.UtcNow,
            IsBreak = request.IsBreak
        };
        await pomodoroRepository.CreateAsync(pomodoro, ct);

        return new PomodoroResponse(
            pomodoro.Id,
            pomodoro.SessionId,
            pomodoro.StartTime,
            pomodoro.EndTime,
            pomodoro.IsBreak);
    }
}
