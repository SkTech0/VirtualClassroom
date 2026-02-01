using MediatR;
using VirtualClassroom.Application.Common.Interfaces;

namespace VirtualClassroom.Application.Rooms.GetParticipants;

public sealed class GetRoomParticipantsQueryHandler(IRoomParticipantRepository participantRepository)
    : IRequestHandler<GetRoomParticipantsQuery, IReadOnlyList<ParticipantDto>>
{
    public async Task<IReadOnlyList<ParticipantDto>> Handle(GetRoomParticipantsQuery request, CancellationToken ct)
    {
        var participants = await participantRepository.GetActiveParticipantsAsync(request.RoomCode, ct);
        return participants.Select(p => new ParticipantDto(
            p.UserId, p.Username, p.Email, p.Status, p.IsHost)).ToList();
    }
}
