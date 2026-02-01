namespace VirtualClassroom.Domain.Entities;

public class Session
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid RoomId { get; set; }
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LeftAt { get; set; }
    public string? Status { get; set; }

    public virtual ICollection<Pomodoro> Pomodoros { get; set; } = new List<Pomodoro>();
}
