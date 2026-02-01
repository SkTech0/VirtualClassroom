using MediatR;
using VirtualClassroom.Application.Common.Interfaces;
using VirtualClassroom.Application.Rooms;

namespace VirtualClassroom.Application.Rooms.GetUserRooms;

public sealed class GetUserRoomsQueryHandler(
    ISessionRepository sessionRepository,
    IRoomRepository roomRepository,
    IIdentityService identityService)
    : IRequestHandler<GetUserRoomsQuery, IReadOnlyList<RoomResponse>>
{
    public async Task<IReadOnlyList<RoomResponse>> Handle(GetUserRoomsQuery request, CancellationToken ct)
    {
        var userId = Guid.Parse(request.UserId);
        var sessions = await sessionRepository.GetActiveByUserAsync(userId, ct);
        if (sessions.Count == 0)
            return Array.Empty<RoomResponse>();

        var roomIds = sessions.Select(s => s.RoomId).Distinct().ToList();
        var rooms = await roomRepository.GetByIdsAsync(roomIds, ct);
        var roomMap = rooms.ToDictionary(r => r.Id);

        var result = new List<RoomResponse>();
        foreach (var room in rooms)
        {
            var participantCount = await sessionRepository.GetActiveByRoomAsync(room.Id, ct);
            var hostInfo = await identityService.GetUserInfoAsync(room.HostUserId.ToString());
            var session = sessions.FirstOrDefault(s => s.RoomId == room.Id);
            result.Add(new RoomResponse(
                room.Id,
                room.Code,
                room.Subject,
                hostInfo?.Username ?? "Host",
                room.IsActive,
                room.CreatedAt,
                session?.Id,
                participantCount.Count));
        }

        return result.OrderByDescending(r => r.CreatedAt).ToList();
    }
}
