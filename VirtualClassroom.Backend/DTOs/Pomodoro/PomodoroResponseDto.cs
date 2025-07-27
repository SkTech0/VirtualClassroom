using System;

namespace VirtualClassroom.Backend.DTOs.Pomodoro
{
    public class PomodoroResponseDto
    {
        public Guid Id { get; set; }
        public Guid SessionId { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime? EndTime { get; set; }
        public bool IsBreak { get; set; }
    }
} 