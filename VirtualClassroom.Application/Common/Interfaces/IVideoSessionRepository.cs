using VirtualClassroom.Domain.Entities;

namespace VirtualClassroom.Application.Common.Interfaces;

public interface IVideoSessionRepository
{
    Task<VideoSession> JoinAsync(VideoSession session, CancellationToken ct = default);
    Task LeaveAsync(string roomCode, Guid userId, CancellationToken ct = default);
    Task<VideoSession?> GetActiveAsync(string roomCode, Guid userId, CancellationToken ct = default);
    Task UpdateStateAsync(string roomCode, Guid userId, bool isVideoEnabled, bool isAudioEnabled, CancellationToken ct = default);
    Task<IReadOnlyList<VideoSession>> GetActiveByRoomAsync(string roomCode, CancellationToken ct = default);
}
