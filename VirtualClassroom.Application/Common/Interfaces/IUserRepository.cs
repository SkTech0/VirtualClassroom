namespace VirtualClassroom.Application.Common.Interfaces;

public interface IRoomParticipantRepository
{
    Task<IReadOnlyList<RoomParticipant>> GetActiveParticipantsAsync(string roomCode, CancellationToken ct = default);
}

public record RoomParticipant(Guid UserId, string Username, string? Email, string Status, bool IsHost);
