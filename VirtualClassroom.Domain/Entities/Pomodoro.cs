namespace VirtualClassroom.Domain.Entities;

public class Pomodoro
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public bool IsBreak { get; set; }
}
