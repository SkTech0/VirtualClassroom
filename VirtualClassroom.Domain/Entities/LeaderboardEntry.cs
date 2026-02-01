namespace VirtualClassroom.Domain.Entities;

public class LeaderboardEntry
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public DateTime Date { get; set; }
    public int Pomodoros { get; set; }
    public int FocusMinutes { get; set; }
}
