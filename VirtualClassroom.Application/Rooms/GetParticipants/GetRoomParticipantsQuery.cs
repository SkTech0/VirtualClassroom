using MediatR;

namespace VirtualClassroom.Application.Rooms.GetParticipants;

public record GetRoomParticipantsQuery(string RoomCode) : IRequest<IReadOnlyList<ParticipantDto>>;

public record ParticipantDto(Guid Id, string Name, string? Email, string? Status, bool IsHost);
