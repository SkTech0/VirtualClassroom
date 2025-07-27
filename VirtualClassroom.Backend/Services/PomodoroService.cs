using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using VirtualClassroom.Backend.Data;
using VirtualClassroom.Backend.DTOs.Pomodoro;
using VirtualClassroom.Backend.Models;
using VirtualClassroom.Backend.Services.Interfaces;

namespace VirtualClassroom.Backend.Services
{
    public class PomodoroService : IPomodoroService
    {
        private readonly ApplicationDbContext _dbContext;

        public PomodoroService(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<PomodoroResponseDto> StartPomodoroAsync(string userId, StartPomodoroDto dto)
        {
            // Validate session
            var session = await _dbContext.Sessions.Include(s => s.User)
                .FirstOrDefaultAsync(s => s.Id == dto.SessionId && s.UserId.ToString() == userId && s.LeftAt == null);
            if (session == null) throw new Exception("Session not found or not active");

            // Create Pomodoro
            var pomodoro = new Pomodoro
            {
                Id = Guid.NewGuid(),
                SessionId = session.Id,
                StartTime = DateTime.UtcNow,
                IsBreak = dto.IsBreak
            };
            _dbContext.Pomodoros.Add(pomodoro);
            await _dbContext.SaveChangesAsync();

            return MapToPomodoroResponseDto(pomodoro);
        }

        public async Task<PomodoroResponseDto> EndPomodoroAsync(string userId, EndPomodoroDto dto)
        {
            // Find Pomodoro and validate user/session
            var pomodoro = await _dbContext.Pomodoros
                .Include(p => p.Session)
                .FirstOrDefaultAsync(p => p.Id == dto.PomodoroId && p.Session.UserId.ToString() == userId);
            if (pomodoro == null) throw new Exception("Pomodoro not found");
            if (pomodoro.EndTime != null) throw new Exception("Pomodoro already ended");

            pomodoro.EndTime = dto.EndTime;
            await _dbContext.SaveChangesAsync();

            return MapToPomodoroResponseDto(pomodoro);
        }

        public async Task<List<PomodoroResponseDto>> GetPomodorosBySessionAsync(Guid sessionId)
        {
            var pomodoros = await _dbContext.Pomodoros
                .Where(p => p.SessionId == sessionId)
                .OrderBy(p => p.StartTime)
                .ToListAsync();
            return pomodoros.Select(MapToPomodoroResponseDto).ToList();
        }

        private PomodoroResponseDto MapToPomodoroResponseDto(Pomodoro pomodoro)
        {
            return new PomodoroResponseDto
            {
                Id = pomodoro.Id,
                SessionId = pomodoro.SessionId,
                StartTime = pomodoro.StartTime,
                EndTime = pomodoro.EndTime,
                IsBreak = pomodoro.IsBreak
            };
        }
    }
} 