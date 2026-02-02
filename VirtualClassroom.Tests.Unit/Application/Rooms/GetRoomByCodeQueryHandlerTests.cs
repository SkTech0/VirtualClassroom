using VirtualClassroom.Application.Common.Interfaces;
using VirtualClassroom.Application.Rooms.GetRoom;
using VirtualClassroom.Domain.Entities;

namespace VirtualClassroom.Tests.Unit.Application.Rooms;

public sealed class GetRoomByCodeQueryHandlerTests
{
    private readonly Mock<IRoomRepository> _roomRepository;
    private readonly Mock<IIdentityService> _identityService;
    private readonly GetRoomByCodeQueryHandler _sut;

    public GetRoomByCodeQueryHandlerTests()
    {
        _roomRepository = new Mock<IRoomRepository>();
        _identityService = new Mock<IIdentityService>();
        _sut = new GetRoomByCodeQueryHandler(_roomRepository.Object, _identityService.Object);
    }

    [Fact]
    public async Task Handle_RoomExists_ReturnsRoomResponse()
    {
        var roomId = Guid.NewGuid();
        var hostUserId = Guid.NewGuid();
        var room = new Room
        {
            Id = roomId,
            Code = "ABC123",
            Subject = "Math",
            HostUserId = hostUserId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        _roomRepository.Setup(x => x.GetByCodeAsync("ABC123", It.IsAny<CancellationToken>())).ReturnsAsync(room);
        _identityService.Setup(x => x.GetUserInfoAsync(hostUserId.ToString()))
            .ReturnsAsync(new UserInfoDto("host1", "h@test.com", new List<string>()));

        var result = await _sut.Handle(new GetRoomByCodeQuery("abc123"), CancellationToken.None);

        result.Should().NotBeNull();
        result.Code.Should().Be("ABC123");
        result.Subject.Should().Be("Math");
        result.HostUsername.Should().Be("host1");
    }

    [Fact]
    public async Task Handle_RoomNotFound_ThrowsInvalidOperationException()
    {
        _roomRepository.Setup(x => x.GetByCodeAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Room?)null);

        var act = () => _sut.Handle(new GetRoomByCodeQuery("XYZ999"), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Room not found");
    }
}
