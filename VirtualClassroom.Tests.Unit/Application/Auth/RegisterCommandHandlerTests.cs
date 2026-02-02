using VirtualClassroom.Application.Auth;
using VirtualClassroom.Application.Auth.Register;
using VirtualClassroom.Application.Common.Interfaces;

namespace VirtualClassroom.Tests.Unit.Application.Auth;

public sealed class RegisterCommandHandlerTests
{
    private readonly Mock<IIdentityService> _identityService;
    private readonly Mock<IAuthTokenService> _tokenService;
    private readonly RegisterCommandHandler _sut;

    public RegisterCommandHandlerTests()
    {
        _identityService = new Mock<IIdentityService>();
        _tokenService = new Mock<IAuthTokenService>();
        _sut = new RegisterCommandHandler(_identityService.Object, _tokenService.Object);
    }

    [Fact]
    public async Task Handle_ValidInput_ReturnsAuthResponse()
    {
        var userId = Guid.NewGuid().ToString();
        _identityService
            .Setup(x => x.RegisterAsync("u@test.com", "user1", "Pass123!"))
            .ReturnsAsync((true, userId, (IList<string>)null!));
        _identityService
            .Setup(x => x.GetUserInfoAsync(userId))
            .ReturnsAsync(new UserInfoDto("user1", "u@test.com", new List<string> { "Student" }));
        _tokenService
            .Setup(x => x.GenerateTokensAsync(userId, "u@test.com", "user1", It.IsAny<IList<string>>()))
            .ReturnsAsync(new AuthTokenResult("access", "refresh", DateTime.UtcNow.AddMinutes(15), 900));

        var result = await _sut.Handle(
            new RegisterCommand("u@test.com", "user1", "Pass123!"), CancellationToken.None);

        result.Should().NotBeNull();
        result.Username.Should().Be("user1");
        result.Email.Should().Be("u@test.com");
        result.AccessToken.Should().Be("access");
    }

    [Fact]
    public async Task Handle_RegistrationFails_ThrowsInvalidOperationException()
    {
        _identityService
            .Setup(x => x.RegisterAsync("u@test.com", "user1", "short"))
            .ReturnsAsync((false, (string?)null, (IList<string>)new List<string> { "Password too short" }));

        var act = () => _sut.Handle(
            new RegisterCommand("u@test.com", "user1", "short"), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Password too short*");
    }

    [Fact]
    public async Task Handle_UserCreatedButInfoNull_ThrowsInvalidOperationException()
    {
        var userId = Guid.NewGuid().ToString();
        _identityService
            .Setup(x => x.RegisterAsync("u@test.com", "user1", "Pass123!"))
            .ReturnsAsync((true, userId, (IList<string>)null!));
        _identityService.Setup(x => x.GetUserInfoAsync(userId)).ReturnsAsync((UserInfoDto?)null);

        var act = () => _sut.Handle(
            new RegisterCommand("u@test.com", "user1", "Pass123!"), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("User created but info not found");
    }
}
