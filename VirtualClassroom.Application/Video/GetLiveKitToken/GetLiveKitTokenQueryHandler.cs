using MediatR;
using VirtualClassroom.Application.Common.Interfaces;

namespace VirtualClassroom.Application.Video.GetLiveKitToken;

public sealed class GetLiveKitTokenQueryHandler(ILiveKitService liveKitService)
    : IRequestHandler<GetLiveKitTokenQuery, string>
{
    public Task<string> Handle(GetLiveKitTokenQuery request, CancellationToken ct)
    {
        var token = liveKitService.GenerateAccessToken(
            request.RoomCode,
            request.UserId,
            request.Username,
            request.CanPublish,
            request.CanSubscribe);
        return Task.FromResult(token);
    }
}
