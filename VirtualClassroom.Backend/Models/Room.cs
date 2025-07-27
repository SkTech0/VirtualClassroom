using System;
using System.Collections.Generic;

namespace VirtualClassroom.Backend.Models
{
    public class Room
    {
        public Guid Id { get; set; }
        public string? Code { get; set; }
        public string? Subject { get; set; }
        public Guid HostUserId { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public ApplicationUser? HostUser { get; set; }
        public ICollection<Session>? Sessions { get; set; }
    }
} 