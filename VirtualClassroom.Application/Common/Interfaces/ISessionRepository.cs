using VirtualClassroom.Domain.Entities;

namespace VirtualClassroom.Application.Common.Interfaces;

public interface ISessionRepository
{
    Task<Session?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Session?> GetActiveByUserAndRoomAsync(Guid userId, Guid roomId, CancellationToken ct = default);
    Task<Session> CreateAsync(Session session, CancellationToken ct = default);
    Task UpdateAsync(Session session, CancellationToken ct = default);
    Task<IReadOnlyList<Session>> GetActiveByRoomAsync(Guid roomId, CancellationToken ct = default);
    Task<IReadOnlyList<Session>> GetActiveByUserAsync(Guid userId, CancellationToken ct = default);
}
