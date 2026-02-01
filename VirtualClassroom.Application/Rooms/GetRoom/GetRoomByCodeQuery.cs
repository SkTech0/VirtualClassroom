using MediatR;

namespace VirtualClassroom.Application.Rooms.GetRoom;

public record GetRoomByCodeQuery(string Code) : IRequest<RoomResponse>;
