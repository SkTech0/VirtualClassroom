using System;
using System.Collections.Generic;

namespace VirtualClassroom.Backend.Models
{
    public class Session
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public Guid RoomId { get; set; }
        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
        public DateTime? LeftAt { get; set; }
        public string? Status { get; set; } // active/idle/on-break

        // Navigation properties
        public ApplicationUser? User { get; set; }
        public Room? Room { get; set; }
        public ICollection<Pomodoro>? Pomodoros { get; set; }
    }
} 