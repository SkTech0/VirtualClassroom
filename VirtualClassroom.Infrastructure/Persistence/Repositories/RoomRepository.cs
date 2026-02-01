using Microsoft.EntityFrameworkCore;
using VirtualClassroom.Application.Common.Interfaces;
using VirtualClassroom.Domain.Entities;
using VirtualClassroom.Infrastructure.Persistence;

namespace VirtualClassroom.Infrastructure.Persistence.Repositories;

public sealed class RoomRepository(ApplicationDbContext db) : IRoomRepository
{
    public async Task<Room?> GetByCodeAsync(string code, CancellationToken ct = default)
    {
        return await db.Rooms.AsNoTracking().FirstOrDefaultAsync(r => r.Code == code, ct);
    }

    public async Task<Room?> GetByCodeActiveAsync(string code, CancellationToken ct = default)
    {
        return await db.Rooms.AsNoTracking()
            .FirstOrDefaultAsync(r => r.Code == code && r.IsActive, ct);
    }

    public async Task<Room> CreateAsync(Room room, CancellationToken ct = default)
    {
        db.Rooms.Add(room);
        await db.SaveChangesAsync(ct);
        return room;
    }

    public async Task UpdateAsync(Room room, CancellationToken ct = default)
    {
        db.Rooms.Update(room);
        await db.SaveChangesAsync(ct);
    }

    public async Task<bool> CodeExistsAsync(string code, CancellationToken ct = default)
    {
        return await db.Rooms.AnyAsync(r => r.Code == code, ct);
    }

    public async Task<IReadOnlyList<Room>> GetByIdsAsync(IReadOnlyList<Guid> ids, CancellationToken ct = default)
    {
        if (ids.Count == 0) return Array.Empty<Room>();
        return await db.Rooms.AsNoTracking()
            .Where(r => ids.Contains(r.Id))
            .ToListAsync(ct);
    }
}
