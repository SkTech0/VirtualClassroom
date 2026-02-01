using MediatR;

namespace VirtualClassroom.Application.Pomodoro.EndPomodoro;

public record EndPomodoroCommand(string UserId, Guid PomodoroId, DateTime EndTime) : IRequest<PomodoroResponse>;
