using VirtualClassroom.Application.Common.Interfaces;
using VirtualClassroom.Application.Rooms.LeaveRoom;
using VirtualClassroom.Domain.Entities;

namespace VirtualClassroom.Tests.Unit.Application.Rooms;

public sealed class LeaveRoomCommandHandlerTests
{
    private readonly Mock<IRoomRepository> _roomRepository;
    private readonly Mock<ISessionRepository> _sessionRepository;
    private readonly LeaveRoomCommandHandler _sut;

    public LeaveRoomCommandHandlerTests()
    {
        _roomRepository = new Mock<IRoomRepository>();
        _sessionRepository = new Mock<ISessionRepository>();
        _sut = new LeaveRoomCommandHandler(_roomRepository.Object, _sessionRepository.Object);
    }

    [Fact]
    public async Task Handle_ValidInput_UpdatesSessionToLeft()
    {
        var userId = Guid.NewGuid();
        var roomId = Guid.NewGuid();
        var room = new Room { Id = roomId, Code = "ABC123", Subject = "Math", HostUserId = Guid.NewGuid(), IsActive = true, CreatedAt = DateTime.UtcNow };
        var session = new Session { Id = Guid.NewGuid(), UserId = userId, RoomId = roomId, Status = "active" };
        _roomRepository.Setup(x => x.GetByCodeActiveAsync("ABC123", It.IsAny<CancellationToken>())).ReturnsAsync(room);
        _sessionRepository.Setup(x => x.GetActiveByUserAndRoomAsync(userId, roomId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(session);

        await _sut.Handle(new LeaveRoomCommand(userId.ToString(), "abc123"), CancellationToken.None);

        session.Status.Should().Be("left");
        session.LeftAt.Should().NotBeNull();
        _sessionRepository.Verify(x => x.UpdateAsync(session, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_RoomNotFound_ThrowsInvalidOperationException()
    {
        _roomRepository.Setup(x => x.GetByCodeActiveAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Room?)null);

        var act = () => _sut.Handle(new LeaveRoomCommand(Guid.NewGuid().ToString(), "XYZ999"), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Room not found or inactive");
    }

    [Fact]
    public async Task Handle_SessionNotFound_ThrowsInvalidOperationException()
    {
        var room = new Room { Id = Guid.NewGuid(), Code = "ABC123", Subject = "Math", HostUserId = Guid.NewGuid(), IsActive = true, CreatedAt = DateTime.UtcNow };
        _roomRepository.Setup(x => x.GetByCodeActiveAsync("ABC123", It.IsAny<CancellationToken>())).ReturnsAsync(room);
        _sessionRepository.Setup(x => x.GetActiveByUserAndRoomAsync(It.IsAny<Guid>(), room.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Session?)null);

        var act = () => _sut.Handle(new LeaveRoomCommand(Guid.NewGuid().ToString(), "ABC123"), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Session not found");
    }
}
