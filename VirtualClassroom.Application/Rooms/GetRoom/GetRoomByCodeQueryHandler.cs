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
        var code = NormalizeRoomCode(request.Code);
        var room = await roomRepository.GetByCodeAsync(code, ct);
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

    private static string NormalizeRoomCode(string? code) =>
        string.IsNullOrWhiteSpace(code) ? string.Empty : code.Trim().ToUpperInvariant();
}
