using Microsoft.AspNetCore.Identity;
using System;

namespace VirtualClassroom.Backend.Models
{
    public class ApplicationUser : IdentityUser<Guid>
    {
        public int StreakCount { get; set; }
        public int TotalSessions { get; set; }
        public bool IsPremium { get; set; }
        public string Role { get; set; } = "User";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
} 