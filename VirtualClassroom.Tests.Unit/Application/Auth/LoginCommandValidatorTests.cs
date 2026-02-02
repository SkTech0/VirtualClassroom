using VirtualClassroom.Application.Auth.Login;

namespace VirtualClassroom.Tests.Unit.Application.Auth;

public sealed class LoginCommandValidatorTests
{
    private readonly LoginCommandValidator _validator = new();

    [Fact]
    public void Email_Empty_ShouldHaveValidationError()
    {
        var result = _validator.Validate(new LoginCommand("", "Pass123"));
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == nameof(LoginCommand.Email) && e.ErrorMessage == "Email is required");
    }

    [Fact]
    public void Email_InvalidFormat_ShouldHaveValidationError()
    {
        var result = _validator.Validate(new LoginCommand("not-an-email", "Pass123"));
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == nameof(LoginCommand.Email) && e.ErrorMessage == "Invalid email format");
    }

    [Fact]
    public void Password_Empty_ShouldHaveValidationError()
    {
        var result = _validator.Validate(new LoginCommand("u@test.com", ""));
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == nameof(LoginCommand.Password) && e.ErrorMessage == "Password is required");
    }

    [Theory]
    [InlineData("u@test.com", "Pass123")]
    [InlineData("user@example.org", "anything")]
    public void ValidInput_ShouldNotHaveErrors(string email, string password)
    {
        var result = _validator.Validate(new LoginCommand(email, password));
        result.IsValid.Should().BeTrue();
        result.Errors.Should().BeEmpty();
    }
}
