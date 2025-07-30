using Microsoft.EntityFrameworkCore;
using VirtualClassroom.Backend.Data;
using VirtualClassroom.Backend.Models;
using VirtualClassroom.Backend.DTOs.Room;
using VirtualClassroom.Backend.Services.Interfaces;

namespace VirtualClassroom.Backend.Services
{
    public class VideoSessionService : IVideoSessionService
    {
        private readonly ApplicationDbContext _context;

        public VideoSessionService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<VideoSession> JoinVideoSessionAsync(string roomCode, Guid userId, string username, string connectionId)
        {
            // Check if user already has an active session
            var existingSession = await _context.VideoSessions
                .FirstOrDefaultAsync(vs => vs.RoomCode == roomCode && vs.UserId == userId && vs.LeftAt == null);

            if (existingSession != null)
            {
                // Update existing session
                existingSession.ConnectionId = connectionId;
                existingSession.JoinedAt = DateTime.UtcNow;
                existingSession.IsVideoEnabled = true;
                existingSession.IsAudioEnabled = true;
                existingSession.IsScreenSharing = false;
            }
            else
            {
                // Create new session
                existingSession = new VideoSession
                {
                    RoomCode = roomCode,
                    UserId = userId,
                    Username = username,
                    ConnectionId = connectionId,
                    JoinedAt = DateTime.UtcNow,
                    IsVideoEnabled = true,
                    IsAudioEnabled = true,
                    IsScreenSharing = false
                };

                _context.VideoSessions.Add(existingSession);
            }

            await _context.SaveChangesAsync();
            return existingSession;
        }

        public async Task LeaveVideoSessionAsync(string roomCode, Guid userId)
        {
            var session = await _context.VideoSessions
                .FirstOrDefaultAsync(vs => vs.RoomCode == roomCode && vs.UserId == userId && vs.LeftAt == null);

            if (session != null)
            {
                session.LeftAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }

        public async Task<IEnumerable<VideoCallDto>> GetActiveVideoParticipantsAsync(string roomCode)
        {
            var activeSessions = await _context.VideoSessions
                .Where(vs => vs.RoomCode == roomCode && vs.LeftAt == null)
                .Select(vs => new VideoCallDto
                {
                    RoomCode = vs.RoomCode,
                    UserId = vs.UserId.ToString(),
                    Username = vs.Username,
                    IsVideoEnabled = vs.IsVideoEnabled,
                    IsAudioEnabled = vs.IsAudioEnabled,
                    IsScreenSharing = vs.IsScreenSharing
                })
                .ToListAsync();

            return activeSessions;
        }

        public async Task UpdateVideoStateAsync(string roomCode, Guid userId, bool isVideoEnabled, bool isAudioEnabled)
        {
            var session = await _context.VideoSessions
                .FirstOrDefaultAsync(vs => vs.RoomCode == roomCode && vs.UserId == userId && vs.LeftAt == null);

            if (session != null)
            {
                session.IsVideoEnabled = isVideoEnabled;
                session.IsAudioEnabled = isAudioEnabled;
                await _context.SaveChangesAsync();
            }
        }

        public async Task UpdateScreenShareStateAsync(string roomCode, Guid userId, bool isScreenSharing)
        {
            var session = await _context.VideoSessions
                .FirstOrDefaultAsync(vs => vs.RoomCode == roomCode && vs.UserId == userId && vs.LeftAt == null);

            if (session != null)
            {
                session.IsScreenSharing = isScreenSharing;
                await _context.SaveChangesAsync();
            }
        }
    }
} 