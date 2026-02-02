using VirtualClassroom.Application.Common.Interfaces;
using VirtualClassroom.Application.Pomodoro;
using VirtualClassroom.Application.Pomodoro.EndPomodoro;
using VirtualClassroom.Domain.Entities;

namespace VirtualClassroom.Tests.Unit.Application.Pomodoro;

public sealed class EndPomodoroCommandHandlerTests
{
    private readonly Mock<IPomodoroRepository> _pomodoroRepository;
    private readonly Mock<ISessionRepository> _sessionRepository;
    private readonly EndPomodoroCommandHandler _sut;

    public EndPomodoroCommandHandlerTests()
    {
        _pomodoroRepository = new Mock<IPomodoroRepository>();
        _sessionRepository = new Mock<ISessionRepository>();
        _sut = new EndPomodoroCommandHandler(_pomodoroRepository.Object, _sessionRepository.Object);
    }

    [Fact]
    public async Task Handle_ValidPomodoro_SetsEndTime_ReturnsPomodoroResponse()
    {
        var userId = Guid.NewGuid();
        var sessionId = Guid.NewGuid();
        var pomodoroId = Guid.NewGuid();
        var endTime = DateTime.UtcNow;
        var pomodoro = new Domain.Entities.Pomodoro
        {
            Id = pomodoroId,
            SessionId = sessionId,
            StartTime = DateTime.UtcNow.AddMinutes(-5),
            EndTime = null,
            IsBreak = false
        };
        var session = new Session { Id = sessionId, UserId = userId, RoomId = Guid.NewGuid() };
        _pomodoroRepository.Setup(x => x.GetByIdAsync(pomodoroId, It.IsAny<CancellationToken>())).ReturnsAsync(pomodoro);
        _sessionRepository.Setup(x => x.GetByIdAsync(sessionId, It.IsAny<CancellationToken>())).ReturnsAsync(session);

        var result = await _sut.Handle(
            new EndPomodoroCommand(userId.ToString(), pomodoroId, endTime), CancellationToken.None);

        result.Should().NotBeNull();
        result.Id.Should().Be(pomodoroId);
        result.EndTime.Should().Be(endTime);
        pomodoro.EndTime.Should().Be(endTime);
        _pomodoroRepository.Verify(x => x.UpdateAsync(pomodoro, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_PomodoroNotFound_ThrowsInvalidOperationException()
    {
        _pomodoroRepository.Setup(x => x.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Domain.Entities.Pomodoro?)null);

        var act = () => _sut.Handle(
            new EndPomodoroCommand(Guid.NewGuid().ToString(), Guid.NewGuid(), DateTime.UtcNow), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Pomodoro not found");
    }

    [Fact]
    public async Task Handle_PomodoroAlreadyEnded_ThrowsInvalidOperationException()
    {
        var pomodoroId = Guid.NewGuid();
        var pomodoro = new Domain.Entities.Pomodoro
        {
            Id = pomodoroId,
            SessionId = Guid.NewGuid(),
            StartTime = DateTime.UtcNow.AddMinutes(-25),
            EndTime = DateTime.UtcNow,
            IsBreak = false
        };
        var session = new Session { Id = pomodoro.SessionId, UserId = Guid.NewGuid(), RoomId = Guid.NewGuid() };
        _pomodoroRepository.Setup(x => x.GetByIdAsync(pomodoroId, It.IsAny<CancellationToken>())).ReturnsAsync(pomodoro);
        _sessionRepository.Setup(x => x.GetByIdAsync(pomodoro.SessionId, It.IsAny<CancellationToken>())).ReturnsAsync(session);

        var act = () => _sut.Handle(
            new EndPomodoroCommand(session.UserId.ToString(), pomodoroId, DateTime.UtcNow), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Pomodoro already ended");
    }
}
