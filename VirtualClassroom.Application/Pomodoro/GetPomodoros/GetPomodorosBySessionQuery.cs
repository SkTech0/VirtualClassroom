using MediatR;

namespace VirtualClassroom.Application.Pomodoro.GetPomodoros;

public record GetPomodorosBySessionQuery(Guid SessionId) : IRequest<IReadOnlyList<PomodoroResponse>>;
