using Microsoft.EntityFrameworkCore;
using VirtualClassroom.Application.Common.Interfaces;
using VirtualClassroom.Domain.Entities;
using VirtualClassroom.Infrastructure.Persistence;

namespace VirtualClassroom.Infrastructure.Persistence.Repositories;

public sealed class SessionRepository(ApplicationDbContext db) : ISessionRepository
{
    public async Task<Session?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await db.Sessions.FirstOrDefaultAsync(s => s.Id == id, ct);
    }

    public async Task<Session?> GetActiveByUserAndRoomAsync(Guid userId, Guid roomId, CancellationToken ct = default)
    {
        return await db.Sessions
            .FirstOrDefaultAsync(s => s.UserId == userId && s.RoomId == roomId && s.LeftAt == null, ct);
    }

    public async Task<Session> CreateAsync(Session session, CancellationToken ct = default)
    {
        db.Sessions.Add(session);
        await db.SaveChangesAsync(ct);
        return session;
    }

    public async Task UpdateAsync(Session session, CancellationToken ct = default)
    {
        db.Sessions.Update(session);
        await db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<Session>> GetActiveByRoomAsync(Guid roomId, CancellationToken ct = default)
    {
        return await db.Sessions
            .Where(s => s.RoomId == roomId && s.LeftAt == null)
            .ToListAsync(ct);
    }
}
