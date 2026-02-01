using MediatR;
using VirtualClassroom.Application.Rooms;

namespace VirtualClassroom.Application.Rooms.GetUserRooms;

public record GetUserRoomsQuery(string UserId) : IRequest<IReadOnlyList<RoomResponse>>;
