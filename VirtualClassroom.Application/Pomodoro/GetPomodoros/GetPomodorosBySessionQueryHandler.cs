using MediatR;
using VirtualClassroom.Application.Common.Interfaces;

namespace VirtualClassroom.Application.Pomodoro.GetPomodoros;

public sealed class GetPomodorosBySessionQueryHandler(IPomodoroRepository pomodoroRepository)
    : IRequestHandler<GetPomodorosBySessionQuery, IReadOnlyList<PomodoroResponse>>
{
    public async Task<IReadOnlyList<PomodoroResponse>> Handle(GetPomodorosBySessionQuery request, CancellationToken ct)
    {
        var pomodoros = await pomodoroRepository.GetBySessionAsync(request.SessionId, ct);
        return pomodoros.Select(p => new PomodoroResponse(
            p.Id, p.SessionId, p.StartTime, p.EndTime, p.IsBreak)).ToList();
    }
}
