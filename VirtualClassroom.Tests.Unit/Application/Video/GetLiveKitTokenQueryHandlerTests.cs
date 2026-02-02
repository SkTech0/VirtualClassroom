using VirtualClassroom.Application.Common.Interfaces;
using VirtualClassroom.Application.Video.GetLiveKitToken;

namespace VirtualClassroom.Tests.Unit.Application.Video;

public sealed class GetLiveKitTokenQueryHandlerTests
{
    private readonly Mock<ILiveKitService> _liveKitService;
    private readonly GetLiveKitTokenQueryHandler _sut;

    public GetLiveKitTokenQueryHandlerTests()
    {
        _liveKitService = new Mock<ILiveKitService>();
        _sut = new GetLiveKitTokenQueryHandler(_liveKitService.Object);
    }

    [Fact]
    public async Task Handle_CallsLiveKitService_ReturnsToken()
    {
        _liveKitService
            .Setup(x => x.GenerateAccessToken("ROOM1", "user-id", "user1", true, true))
            .Returns("jwt-token-string");

        var result = await _sut.Handle(
            new GetLiveKitTokenQuery("user-id", "user1", "ROOM1", true, true), CancellationToken.None);

        result.Should().Be("jwt-token-string");
        _liveKitService.Verify(x => x.GenerateAccessToken("ROOM1", "user-id", "user1", true, true), Times.Once);
    }

    [Fact]
    public async Task Handle_CanPublishFalse_PassesToService()
    {
        _liveKitService
            .Setup(x => x.GenerateAccessToken("R", "u", "n", false, true))
            .Returns("token");

        var result = await _sut.Handle(
            new GetLiveKitTokenQuery("u", "n", "R", false, true), CancellationToken.None);

        result.Should().Be("token");
        _liveKitService.Verify(x => x.GenerateAccessToken("R", "u", "n", false, true), Times.Once);
    }
}
