using MediatR;
using VirtualClassroom.Application.Common.Interfaces;
using VirtualClassroom.Domain.Entities;

namespace VirtualClassroom.Application.Rooms.JoinRoom;

public sealed class JoinRoomCommandHandler(
    IRoomRepository roomRepository,
    ISessionRepository sessionRepository,
    IIdentityService identityService)
    : IRequestHandler<JoinRoomCommand, RoomResponse>
{
    public async Task<RoomResponse> Handle(JoinRoomCommand request, CancellationToken ct)
    {
        var userInfo = await identityService.GetUserInfoAsync(request.UserId);
        if (userInfo is null)
            throw new InvalidOperationException("User not found");

        var room = await roomRepository.GetByCodeActiveAsync(request.Code, ct);
        if (room is null)
            throw new InvalidOperationException("Room not found or inactive");

        var userId = Guid.Parse(request.UserId);
        var existingSession = await sessionRepository.GetActiveByUserAndRoomAsync(userId, room.Id, ct);
        if (existingSession is not null)
            throw new InvalidOperationException("Already joined this room");

        var hostInfo = await identityService.GetUserInfoAsync(room.HostUserId.ToString());
        var session = new Session
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            RoomId = room.Id,
            JoinedAt = DateTime.UtcNow,
            Status = "active"
        };
        await sessionRepository.CreateAsync(session, ct);

        return new RoomResponse(
            room.Id,
            room.Code,
            room.Subject,
            hostInfo?.Username ?? "Host",
            room.IsActive,
            room.CreatedAt,
            session.Id);
    }
}
