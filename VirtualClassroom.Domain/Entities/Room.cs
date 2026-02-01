namespace VirtualClassroom.Domain.Entities;

public class Room
{
    public Guid Id { get; set; }
    public required string Code { get; set; }
    public string? Subject { get; set; }
    public Guid HostUserId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public virtual ICollection<Session> Sessions { get; set; } = new List<Session>();
}
