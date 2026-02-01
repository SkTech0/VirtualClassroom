using MediatR;

namespace VirtualClassroom.Application.Rooms.LeaveRoom;

public record LeaveRoomCommand(string UserId, string RoomCode) : IRequest<Unit>;
