using System;

namespace VirtualClassroom.Backend.DTOs.Pomodoro
{
    public class EndPomodoroDto
    {
        public Guid PomodoroId { get; set; }
        public DateTime EndTime { get; set; }
    }
} 