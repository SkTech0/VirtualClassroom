using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using VirtualClassroom.Backend.DTOs.Pomodoro;

namespace VirtualClassroom.Backend.Services.Interfaces
{
    public interface IPomodoroService
    {
        Task<PomodoroResponseDto> StartPomodoroAsync(string userId, StartPomodoroDto dto);
        Task<PomodoroResponseDto> EndPomodoroAsync(string userId, EndPomodoroDto dto);
        Task<List<PomodoroResponseDto>> GetPomodorosBySessionAsync(Guid sessionId);
    }
} 