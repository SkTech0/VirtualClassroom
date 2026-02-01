namespace VirtualClassroom.Application.Pomodoro;

public record PomodoroResponse(
    Guid Id,
    Guid SessionId,
    DateTime StartTime,
    DateTime? EndTime,
    bool IsBreak);
