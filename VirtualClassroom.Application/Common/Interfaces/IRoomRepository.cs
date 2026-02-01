using VirtualClassroom.Domain.Entities;

namespace VirtualClassroom.Application.Common.Interfaces;

public interface IRoomRepository
{
    Task<Room?> GetByCodeAsync(string code, CancellationToken ct = default);
    Task<Room?> GetByCodeActiveAsync(string code, CancellationToken ct = default);
    Task<Room> CreateAsync(Room room, CancellationToken ct = default);
    Task UpdateAsync(Room room, CancellationToken ct = default);
    Task<bool> CodeExistsAsync(string code, CancellationToken ct = default);
    Task<IReadOnlyList<Room>> GetByIdsAsync(IReadOnlyList<Guid> ids, CancellationToken ct = default);
}
