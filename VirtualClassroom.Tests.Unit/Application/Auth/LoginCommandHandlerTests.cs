using VirtualClassroom.Application.Auth;
using VirtualClassroom.Application.Auth.Login;
using VirtualClassroom.Application.Common.Interfaces;

namespace VirtualClassroom.Tests.Unit.Application.Auth;

public sealed class LoginCommandHandlerTests
{
    private readonly Mock<IIdentityService> _identityService;
    private readonly Mock<IAuthTokenService> _tokenService;
    private readonly LoginCommandHandler _sut;

    public LoginCommandHandlerTests()
    {
        _identityService = new Mock<IIdentityService>();
        _tokenService = new Mock<IAuthTokenService>();
        _sut = new LoginCommandHandler(_identityService.Object, _tokenService.Object);
    }

    [Fact]
    public async Task Handle_ValidCredentials_ReturnsAuthResponse()
    {
        var userId = Guid.NewGuid().ToString();
        _identityService
            .Setup(x => x.ValidateCredentialsAsync("u@test.com", "Pass123"))
            .ReturnsAsync((true, userId, "u@test.com", "user1", (IList<string>?)["Student"]));
        _identityService
            .Setup(x => x.GetUserInfoAsync(userId))
            .ReturnsAsync(new UserInfoDto("user1", "u@test.com", new List<string> { "Student" }));
        _tokenService
            .Setup(x => x.GenerateTokensAsync(userId, "u@test.com", "user1", It.IsAny<IList<string>>()))
            .ReturnsAsync(new AuthTokenResult("access", "refresh", DateTime.UtcNow.AddMinutes(15), 900));

        var result = await _sut.Handle(new LoginCommand("u@test.com", "Pass123"), CancellationToken.None);

        result.Should().NotBeNull();
        result.AccessToken.Should().Be("access");
        result.RefreshToken.Should().Be("refresh");
        result.Username.Should().Be("user1");
        result.Email.Should().Be("u@test.com");
        result.Role.Should().Be("Student");
    }

    [Fact]
    public async Task Handle_InvalidCredentials_ThrowsUnauthorizedAccessException()
    {
        _identityService
            .Setup(x => x.ValidateCredentialsAsync("bad@test.com", "wrong"))
            .ReturnsAsync((false, (string?)null, (string?)null, (string?)null, (IList<string>?)null));

        var act = () => _sut.Handle(new LoginCommand("bad@test.com", "wrong"), CancellationToken.None);

        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Invalid email or password");
    }

    [Fact]
    public async Task Handle_UserInfoNull_ThrowsUnauthorizedAccessException()
    {
        var userId = Guid.NewGuid().ToString();
        _identityService
            .Setup(x => x.ValidateCredentialsAsync("u@test.com", "Pass123"))
            .ReturnsAsync((true, userId, "u@test.com", "user1", (IList<string>?)["Student"]));
        _identityService.Setup(x => x.GetUserInfoAsync(userId)).ReturnsAsync((UserInfoDto?)null);

        var act = () => _sut.Handle(new LoginCommand("u@test.com", "Pass123"), CancellationToken.None);

        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("User info not found");
    }
}
