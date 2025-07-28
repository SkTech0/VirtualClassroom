using System.ComponentModel.DataAnnotations;

namespace VirtualClassroom.Backend.Models
{
    public class VideoSession
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public string RoomCode { get; set; } = string.Empty;
        
        [Required]
        public Guid UserId { get; set; }
        
        [Required]
        public string Username { get; set; } = string.Empty;
        
        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? LeftAt { get; set; }
        
        public bool IsVideoEnabled { get; set; } = true;
        
        public bool IsAudioEnabled { get; set; } = true;
        
        public bool IsScreenSharing { get; set; } = false;
        
        public string ConnectionId { get; set; } = string.Empty;
        
        // Navigation properties
        public virtual Room Room { get; set; } = null!;
        public virtual ApplicationUser User { get; set; } = null!;
    }
} 