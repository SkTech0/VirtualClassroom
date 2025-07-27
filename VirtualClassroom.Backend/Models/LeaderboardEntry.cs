using System;

namespace VirtualClassroom.Backend.Models
{
    public class LeaderboardEntry
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public DateTime Date { get; set; }
        public int Pomodoros { get; set; }
        public int FocusMinutes { get; set; }

        // Navigation property
        public ApplicationUser? User { get; set; }
    }
} 