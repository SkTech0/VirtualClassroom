using System;

namespace VirtualClassroom.Backend.Models
{
    public class Pomodoro
    {
        public Guid Id { get; set; }
        public Guid SessionId { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public bool IsBreak { get; set; }

        // Navigation property
        public Session? Session { get; set; }
    }
} 