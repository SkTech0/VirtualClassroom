using Microsoft.EntityFrameworkCore;
using VirtualClassroom.Application.Common.Interfaces;
using VirtualClassroom.Domain.Entities;
using VirtualClassroom.Infrastructure.Persistence;

namespace VirtualClassroom.Infrastructure.Persistence.Repositories;

public sealed class VideoSessionRepository(ApplicationDbContext db) : IVideoSessionRepository
{
    public async Task<VideoSession> JoinAsync(VideoSession session, CancellationToken ct = default)
    {
        var existing = await db.VideoSessions
            .FirstOrDefaultAsync(vs => vs.RoomCode == session.RoomCode && vs.UserId == session.UserId && vs.LeftAt == null, ct);

        if (existing is not null)
        {
            existing.ConnectionId = session.ConnectionId;
            existing.JoinedAt = DateTime.UtcNow;
            existing.IsVideoEnabled = true;
            existing.IsAudioEnabled = true;
            existing.IsScreenSharing = false;
            db.VideoSessions.Update(existing);
            await db.SaveChangesAsync(ct);
            return existing;
        }

        db.VideoSessions.Add(session);
        await db.SaveChangesAsync(ct);
        return session;
    }

    public async Task LeaveAsync(string roomCode, Guid userId, CancellationToken ct = default)
    {
        var session = await db.VideoSessions
            .FirstOrDefaultAsync(vs => vs.RoomCode == roomCode && vs.UserId == userId && vs.LeftAt == null, ct);
        if (session is not null)
        {
            session.LeftAt = DateTime.UtcNow;
            db.VideoSessions.Update(session);
            await db.SaveChangesAsync(ct);
        }
    }

    public async Task<VideoSession?> GetActiveAsync(string roomCode, Guid userId, CancellationToken ct = default)
    {
        return await db.VideoSessions
            .FirstOrDefaultAsync(vs => vs.RoomCode == roomCode && vs.UserId == userId && vs.LeftAt == null, ct);
    }

    public async Task UpdateStateAsync(string roomCode, Guid userId, bool isVideoEnabled, bool isAudioEnabled, CancellationToken ct = default)
    {
        var session = await db.VideoSessions
            .FirstOrDefaultAsync(vs => vs.RoomCode == roomCode && vs.UserId == userId && vs.LeftAt == null, ct);
        if (session is not null)
        {
            session.IsVideoEnabled = isVideoEnabled;
            session.IsAudioEnabled = isAudioEnabled;
            db.VideoSessions.Update(session);
            await db.SaveChangesAsync(ct);
        }
    }

    public async Task<IReadOnlyList<VideoSession>> GetActiveByRoomAsync(string roomCode, CancellationToken ct = default)
    {
        return await db.VideoSessions
            .Where(vs => vs.RoomCode == roomCode && vs.LeftAt == null)
            .ToListAsync(ct);
    }
}
