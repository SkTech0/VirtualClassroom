using MediatR;
using VirtualClassroom.Application.Common.Interfaces;

namespace VirtualClassroom.Application.Rooms.GetRoom;

public sealed class GetRoomByCodeQueryHandler(
    IRoomRepository roomRepository,
    IIdentityService identityService)
    : IRequestHandler<GetRoomByCodeQuery, RoomResponse>
{
    public async Task<RoomResponse> Handle(GetRoomByCodeQuery request, CancellationToken ct)
    {
        var room = await roomRepository.GetByCodeAsync(request.Code, ct);
        if (room is null)
            throw new InvalidOperationException("Room not found");

        var hostInfo = await identityService.GetUserInfoAsync(room.HostUserId.ToString());
        return new RoomResponse(
            room.Id,
            room.Code,
            room.Subject,
            hostInfo?.Username ?? "Host",
            room.IsActive,
            room.CreatedAt);
    }
}
