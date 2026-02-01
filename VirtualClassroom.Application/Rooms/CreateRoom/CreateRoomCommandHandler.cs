using MediatR;
using VirtualClassroom.Application.Common.Interfaces;
using VirtualClassroom.Domain.Entities;

namespace VirtualClassroom.Application.Rooms.CreateRoom;

public sealed class CreateRoomCommandHandler(
    IRoomRepository roomRepository,
    ISessionRepository sessionRepository,
    IIdentityService identityService)
    : IRequestHandler<CreateRoomCommand, RoomResponse>
{
    public async Task<RoomResponse> Handle(CreateRoomCommand request, CancellationToken ct)
    {
        var userInfo = await identityService.GetUserInfoAsync(request.HostUserId);
        if (userInfo is null)
            throw new InvalidOperationException("Host user not found");

        var hostUserId = Guid.Parse(request.HostUserId);
        string code;
        do
        {
            code = GenerateRoomCode();
        } while (await roomRepository.CodeExistsAsync(code, ct));

        var room = new Room
        {
            Id = Guid.NewGuid(),
            Code = code,
            Subject = request.Subject,
            HostUserId = hostUserId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await roomRepository.CreateAsync(room, ct);

        var session = new Session
        {
            Id = Guid.NewGuid(),
            UserId = hostUserId,
            RoomId = room.Id,
            JoinedAt = DateTime.UtcNow,
            Status = "active"
        };
        await sessionRepository.CreateAsync(session, ct);

        return new RoomResponse(
            room.Id,
            room.Code,
            room.Subject,
            userInfo.Username ?? "Host",
            room.IsActive,
            room.CreatedAt,
            session.Id);
    }

    private static string GenerateRoomCode()
    {
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        var random = new Random();
        return new string(Enumerable.Range(0, 6).Select(_ => chars[random.Next(chars.Length)]).ToArray());
    }
}
