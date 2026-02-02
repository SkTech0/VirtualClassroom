using VirtualClassroom.Application.Common.Interfaces;
using VirtualClassroom.Application.Rooms;
using VirtualClassroom.Application.Rooms.CreateRoom;
using VirtualClassroom.Domain.Entities;

namespace VirtualClassroom.Tests.Unit.Application.Rooms;

public sealed class CreateRoomCommandHandlerTests
{
    private readonly Mock<IRoomRepository> _roomRepository;
    private readonly Mock<ISessionRepository> _sessionRepository;
    private readonly Mock<IIdentityService> _identityService;
    private readonly CreateRoomCommandHandler _sut;

    public CreateRoomCommandHandlerTests()
    {
        _roomRepository = new Mock<IRoomRepository>();
        _sessionRepository = new Mock<ISessionRepository>();
        _identityService = new Mock<IIdentityService>();
        _sut = new CreateRoomCommandHandler(
            _roomRepository.Object,
            _sessionRepository.Object,
            _identityService.Object);
    }

    [Fact]
    public async Task Handle_ValidInput_CreatesRoomAndSession_ReturnsRoomResponse()
    {
        var hostUserId = Guid.NewGuid().ToString();
        _identityService
            .Setup(x => x.GetUserInfoAsync(hostUserId))
            .ReturnsAsync(new UserInfoDto("host1", "host@test.com", new List<string> { "Student" }));
        _roomRepository.Setup(x => x.CodeExistsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var result = await _sut.Handle(
            new CreateRoomCommand(hostUserId, "Math"), CancellationToken.None);

        result.Should().NotBeNull();
        result.Subject.Should().Be("Math");
        result.HostUsername.Should().Be("host1");
        result.SessionId.Should().NotBeNull();
        _roomRepository.Verify(x => x.CreateAsync(It.Is<Room>(r =>
            r.Subject == "Math" && r.HostUserId == Guid.Parse(hostUserId) && r.IsActive), It.IsAny<CancellationToken>()), Times.Once);
        _sessionRepository.Verify(x => x.CreateAsync(It.Is<Session>(s =>
            s.UserId == Guid.Parse(hostUserId) && s.Status == "active"), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_HostUserNotFound_ThrowsInvalidOperationException()
    {
        var hostUserId = Guid.NewGuid().ToString();
        _identityService.Setup(x => x.GetUserInfoAsync(hostUserId)).ReturnsAsync((UserInfoDto?)null);

        var act = () => _sut.Handle(new CreateRoomCommand(hostUserId, "Math"), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Host user not found");
        _roomRepository.Verify(x => x.CreateAsync(It.IsAny<Room>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
