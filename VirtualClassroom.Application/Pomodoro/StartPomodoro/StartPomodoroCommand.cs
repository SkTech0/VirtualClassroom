using MediatR;

namespace VirtualClassroom.Application.Pomodoro.StartPomodoro;

public record StartPomodoroCommand(string UserId, Guid SessionId, bool IsBreak) : IRequest<PomodoroResponse>;
