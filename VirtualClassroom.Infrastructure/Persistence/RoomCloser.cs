using Microsoft.EntityFrameworkCore;
using VirtualClassroom.Application.Common.Interfaces;
using VirtualClassroom.Infrastructure.Persistence;

namespace VirtualClassroom.Infrastructure.Persistence;

public sealed class RoomCloser(ApplicationDbContext db) : IRoomCloser
{
    public async Task CloseRoomAsync(string roomCode, CancellationToken ct = default)
    {
        var room = await db.Rooms.FirstOrDefaultAsync(r => r.Code == roomCode && r.IsActive, ct);
        if (room is null) return;

        room.IsActive = false;
        db.Rooms.Update(room);

        var sessions = await db.Sessions.Where(s => s.RoomId == room.Id && s.LeftAt == null).ToListAsync(ct);
        foreach (var session in sessions)
        {
            session.LeftAt = DateTime.UtcNow;
            session.Status = "closed";
        }
        db.Sessions.UpdateRange(sessions);

        var videoSessions = await db.VideoSessions.Where(vs => vs.RoomCode == roomCode && vs.LeftAt == null).ToListAsync(ct);
        foreach (var vs in videoSessions)
        {
            vs.LeftAt = DateTime.UtcNow;
        }
        db.VideoSessions.UpdateRange(videoSessions);

        await db.SaveChangesAsync(ct);
    }
}
