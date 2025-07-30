using VirtualClassroom.Backend.Models;
using VirtualClassroom.Backend.DTOs.Room;

namespace VirtualClassroom.Backend.Services.Interfaces
{
    public interface IVideoSessionService
    {
        Task<VideoSession> JoinVideoSessionAsync(string roomCode, Guid userId, string username, string connectionId);
        Task LeaveVideoSessionAsync(string roomCode, Guid userId);
        Task<IEnumerable<VideoCallDto>> GetActiveVideoParticipantsAsync(string roomCode);
        Task UpdateVideoStateAsync(string roomCode, Guid userId, bool isVideoEnabled, bool isAudioEnabled);
        Task UpdateScreenShareStateAsync(string roomCode, Guid userId, bool isScreenSharing);
    }
} 