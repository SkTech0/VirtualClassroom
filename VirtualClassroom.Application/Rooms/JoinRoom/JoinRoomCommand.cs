using MediatR;

namespace VirtualClassroom.Application.Rooms.JoinRoom;

public record JoinRoomCommand(string UserId, string Code) : IRequest<RoomResponse>;
