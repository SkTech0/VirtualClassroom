using MediatR;

namespace VirtualClassroom.Application.Rooms.CreateRoom;

public record CreateRoomCommand(string HostUserId, string Subject) : IRequest<RoomResponse>;
