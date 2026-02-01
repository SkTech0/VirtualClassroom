namespace VirtualClassroom.Domain.Entities;

public class VideoSession
{
    public int Id { get; set; }
    public required string RoomCode { get; set; }
    public Guid UserId { get; set; }
    public required string Username { get; set; }
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LeftAt { get; set; }
    public bool IsVideoEnabled { get; set; } = true;
    public bool IsAudioEnabled { get; set; } = true;
    public bool IsScreenSharing { get; set; }
    public required string ConnectionId { get; set; }
}
