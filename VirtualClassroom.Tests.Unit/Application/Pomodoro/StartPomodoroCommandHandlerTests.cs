using VirtualClassroom.Application.Common.Interfaces;
using VirtualClassroom.Application.Pomodoro;
using VirtualClassroom.Application.Pomodoro.StartPomodoro;
using VirtualClassroom.Domain.Entities;

namespace VirtualClassroom.Tests.Unit.Application.Pomodoro;

public sealed class StartPomodoroCommandHandlerTests
{
    private readonly Mock<IPomodoroRepository> _pomodoroRepository;
    private readonly Mock<ISessionRepository> _sessionRepository;
    private readonly StartPomodoroCommandHandler _sut;

    public StartPomodoroCommandHandlerTests()
    {
        _pomodoroRepository = new Mock<IPomodoroRepository>();
        _sessionRepository = new Mock<ISessionRepository>();
        _sut = new StartPomodoroCommandHandler(_pomodoroRepository.Object, _sessionRepository.Object);
    }

    [Fact]
    public async Task Handle_ValidSession_CreatesPomodoro_ReturnsPomodoroResponse()
    {
        var userId = Guid.NewGuid();
        var sessionId = Guid.NewGuid();
        var session = new Session { Id = sessionId, UserId = userId, RoomId = Guid.NewGuid(), Status = "active" };
        _sessionRepository.Setup(x => x.GetByIdAsync(sessionId, It.IsAny<CancellationToken>())).ReturnsAsync(session);
        _pomodoroRepository.Setup(x => x.CreateAsync(It.IsAny<Domain.Entities.Pomodoro>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Domain.Entities.Pomodoro p, CancellationToken _) => p);

        var result = await _sut.Handle(
            new StartPomodoroCommand(userId.ToString(), sessionId, false), CancellationToken.None);

        result.Should().NotBeNull();
        result.SessionId.Should().Be(sessionId);
        result.IsBreak.Should().BeFalse();
        result.EndTime.Should().BeNull();
        _pomodoroRepository.Verify(x => x.CreateAsync(It.Is<Domain.Entities.Pomodoro>(p =>
            p.SessionId == sessionId && p.IsBreak == false && p.EndTime == null), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_SessionNotFound_ThrowsInvalidOperationException()
    {
        _sessionRepository.Setup(x => x.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Session?)null);

        var act = () => _sut.Handle(
            new StartPomodoroCommand(Guid.NewGuid().ToString(), Guid.NewGuid(), false), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Session not found or not active");
    }

    [Fact]
    public async Task Handle_SessionAlreadyLeft_ThrowsInvalidOperationException()
    {
        var userId = Guid.NewGuid();
        var sessionId = Guid.NewGuid();
        var session = new Session { Id = sessionId, UserId = userId, RoomId = Guid.NewGuid(), LeftAt = DateTime.UtcNow, Status = "left" };
        _sessionRepository.Setup(x => x.GetByIdAsync(sessionId, It.IsAny<CancellationToken>())).ReturnsAsync(session);

        var act = () => _sut.Handle(new StartPomodoroCommand(userId.ToString(), sessionId, false), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Session not found or not active");
    }
}
