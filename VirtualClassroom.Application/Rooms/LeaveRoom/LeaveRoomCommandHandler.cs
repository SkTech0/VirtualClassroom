using MediatR;
using VirtualClassroom.Application.Common.Interfaces;

namespace VirtualClassroom.Application.Rooms.LeaveRoom;

public sealed class LeaveRoomCommandHandler(
    IRoomRepository roomRepository,
    ISessionRepository sessionRepository)
    : IRequestHandler<LeaveRoomCommand, Unit>
{
    public async Task<Unit> Handle(LeaveRoomCommand request, CancellationToken ct)
    {
        var room = await roomRepository.GetByCodeActiveAsync(request.RoomCode, ct);
        if (room is null)
            throw new InvalidOperationException("Room not found or inactive");

        var userId = Guid.Parse(request.UserId);
        var session = await sessionRepository.GetActiveByUserAndRoomAsync(userId, room.Id, ct);
        if (session is null)
            throw new InvalidOperationException("Session not found");

        session.LeftAt = DateTime.UtcNow;
        session.Status = "left";
        await sessionRepository.UpdateAsync(session, ct);
        return Unit.Value;
    }
}
