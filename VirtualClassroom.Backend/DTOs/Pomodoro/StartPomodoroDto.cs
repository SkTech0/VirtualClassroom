using System;

namespace VirtualClassroom.Backend.DTOs.Pomodoro
{
    public class StartPomodoroDto
    {
        public Guid SessionId { get; set; }
        public bool IsBreak { get; set; }
    }
} 