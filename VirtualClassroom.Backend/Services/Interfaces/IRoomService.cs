using System.Threading.Tasks;

using VirtualClassroom.Backend.DTOs.Room;

using System;

using System.Collections.Generic;



namespace VirtualClassroom.Backend.Services.Interfaces

{

    public interface IRoomService

    {

        Task<RoomResponseDto> CreateRoomAsync(string hostUserId, CreateRoomDto dto);

        Task<RoomResponseDto> JoinRoomAsync(string userId, JoinRoomDto dto);

        Task LeaveRoomAsync(string userId, string roomCode);

        Task<RoomResponseDto> GetRoomByCodeAsync(string roomCode);

        Task<List<UserDto>> GetParticipantsAsync(string roomCode);

        Task CloseRoomAsync(string roomCode);

    }

}