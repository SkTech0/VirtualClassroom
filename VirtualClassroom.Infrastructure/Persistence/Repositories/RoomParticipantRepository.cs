using Microsoft.EntityFrameworkCore;
using VirtualClassroom.Application.Common.Interfaces;
using VirtualClassroom.Domain.Entities;
using VirtualClassroom.Infrastructure.Identity;
using VirtualClassroom.Infrastructure.Persistence;

namespace VirtualClassroom.Infrastructure.Persistence.Repositories;

public sealed class RoomParticipantRepository(ApplicationDbContext db) : IRoomParticipantRepository
{
    public async Task<IReadOnlyList<RoomParticipant>> GetActiveParticipantsAsync(string roomCode, CancellationToken ct = default)
    {
        var room = await db.Rooms.FirstOrDefaultAsync(r => r.Code == roomCode, ct);
        if (room is null) return Array.Empty<RoomParticipant>();

        var sessions = await db.Sessions
            .Where(s => s.RoomId == room.Id && s.LeftAt == null)
            .ToListAsync(ct);

        var userIds = sessions.Select(s => s.UserId).Distinct().ToList();
        var users = await db.Users
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, ct);

        return sessions
            .Where(s => users.TryGetValue(s.UserId, out var u) && u is not null)
            .Select(s =>
            {
                var user = users[s.UserId];
                return new RoomParticipant(
                    user.Id,
                    user.UserName ?? "Unknown",
                    user.Email,
                    s.Status ?? "active",
                    user.Id == room.HostUserId);
            })
            .ToList();
    }
}
