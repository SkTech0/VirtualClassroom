using MediatR;

namespace VirtualClassroom.Application.Video.GetLiveKitToken;

public record GetLiveKitTokenQuery(string UserId, string Username, string RoomCode, bool CanPublish = true, bool CanSubscribe = true) : IRequest<string>;
