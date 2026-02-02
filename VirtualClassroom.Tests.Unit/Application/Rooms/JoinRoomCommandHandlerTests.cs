using VirtualClassroom.Application.Common.Interfaces;
using VirtualClassroom.Application.Rooms;
using VirtualClassroom.Application.Rooms.JoinRoom;
using VirtualClassroom.Domain.Entities;

namespace VirtualClassroom.Tests.Unit.Application.Rooms;

public sealed class JoinRoomCommandHandlerTests
{
    private readonly Mock<IRoomRepository> _roomRepository;
    private readonly Mock<ISessionRepository> _sessionRepository;
    private readonly Mock<IIdentityService> _identityService;
    private readonly JoinRoomCommandHandler _sut;

    public JoinRoomCommandHandlerTests()
    {
        _roomRepository = new Mock<IRoomRepository>();
        _sessionRepository = new Mock<ISessionRepository>();
        _identityService = new Mock<IIdentityService>();
        _sut = new JoinRoomCommandHandler(
            _roomRepository.Object,
            _sessionRepository.Object,
            _identityService.Object);
    }

    [Fact]
    public async Task Handle_ValidInput_CreatesSession_ReturnsRoomResponse()
    {
        var userId = Guid.NewGuid();
        var roomId = Guid.NewGuid();
        var room = new Room
        {
            Id = roomId,
            Code = "ABC123",
            Subject = "Math",
            HostUserId = Guid.NewGuid(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        _identityService
            .Setup(x => x.GetUserInfoAsync(userId.ToString()))
            .ReturnsAsync(new UserInfoDto("user1", "u@test.com", new List<string>()));
        _identityService
            .Setup(x => x.GetUserInfoAsync(room.HostUserId.ToString()))
            .ReturnsAsync(new UserInfoDto("host1", "h@test.com", new List<string>()));
        _roomRepository.Setup(x => x.GetByCodeActiveAsync("ABC123", It.IsAny<CancellationToken>()))
            .ReturnsAsync(room);
        _sessionRepository.Setup(x => x.GetActiveByUserAndRoomAsync(userId, roomId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Session?)null);

        var result = await _sut.Handle(
            new JoinRoomCommand(userId.ToString(), "abc123"), CancellationToken.None);

        result.Should().NotBeNull();
        result.Code.Should().Be("ABC123");
        result.HostUsername.Should().Be("host1");
        result.SessionId.Should().NotBeNull();
        _sessionRepository.Verify(x => x.CreateAsync(It.Is<Session>(s =>
            s.UserId == userId && s.RoomId == roomId && s.Status == "active"), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_RoomNotFound_ThrowsInvalidOperationException()
    {
        var userId = Guid.NewGuid().ToString();
        _identityService.Setup(x => x.GetUserInfoAsync(userId)).ReturnsAsync(new UserInfoDto("u", "u@t.com", new List<string>()));
        _roomRepository.Setup(x => x.GetByCodeActiveAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Room?)null);

        var act = () => _sut.Handle(new JoinRoomCommand(userId, "XYZ999"), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Room not found or inactive");
    }

    [Fact]
    public async Task Handle_AlreadyJoined_ThrowsInvalidOperationException()
    {
        var userId = Guid.NewGuid();
        var room = new Room { Id = Guid.NewGuid(), Code = "ABC123", Subject = "Math", HostUserId = Guid.NewGuid(), IsActive = true, CreatedAt = DateTime.UtcNow };
        _identityService.Setup(x => x.GetUserInfoAsync(userId.ToString())).ReturnsAsync(new UserInfoDto("u", "u@t.com", new List<string>()));
        _roomRepository.Setup(x => x.GetByCodeActiveAsync("ABC123", It.IsAny<CancellationToken>())).ReturnsAsync(room);
        _sessionRepository.Setup(x => x.GetActiveByUserAndRoomAsync(userId, room.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Session { Id = Guid.NewGuid(), UserId = userId, RoomId = room.Id });

        var act = () => _sut.Handle(new JoinRoomCommand(userId.ToString(), "ABC123"), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Already joined this room");
    }
}
