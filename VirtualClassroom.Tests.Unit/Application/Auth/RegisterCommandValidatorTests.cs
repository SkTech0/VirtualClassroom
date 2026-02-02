using VirtualClassroom.Application.Auth.Register;

namespace VirtualClassroom.Tests.Unit.Application.Auth;

public sealed class RegisterCommandValidatorTests
{
    private readonly RegisterCommandValidator _validator = new();

    [Fact]
    public void Email_Empty_ShouldHaveValidationError()
    {
        var result = _validator.Validate(new RegisterCommand("", "user1", "Pass123!"));
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == nameof(RegisterCommand.Email) && e.ErrorMessage == "Email is required");
    }

    [Fact]
    public void Email_InvalidFormat_ShouldHaveValidationError()
    {
        var result = _validator.Validate(new RegisterCommand("bad", "user1", "Pass123!"));
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == nameof(RegisterCommand.Email) && e.ErrorMessage == "Invalid email format");
    }

    [Fact]
    public void Username_TooShort_ShouldHaveValidationError()
    {
        var result = _validator.Validate(new RegisterCommand("u@test.com", "ab", "Pass123!"));
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == nameof(RegisterCommand.Username) && e.ErrorMessage == "Username must be at least 3 characters");
    }

    [Fact]
    public void Password_TooShort_ShouldHaveValidationError()
    {
        var result = _validator.Validate(new RegisterCommand("u@test.com", "user1", "Short1!"));
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == nameof(RegisterCommand.Password) && e.ErrorMessage == "Password must be at least 8 characters");
    }

    [Fact]
    public void Password_NoUppercase_ShouldHaveValidationError()
    {
        var result = _validator.Validate(new RegisterCommand("u@test.com", "user1", "password1"));
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == nameof(RegisterCommand.Password) && e.ErrorMessage == "Password must contain at least one uppercase letter");
    }

    [Theory]
    [InlineData("u@test.com", "user1", "Pass123!")]
    [InlineData("admin@example.org", "admin", "Admin123")]
    public void ValidInput_ShouldNotHaveErrors(string email, string username, string password)
    {
        var result = _validator.Validate(new RegisterCommand(email, username, password));
        result.IsValid.Should().BeTrue();
        result.Errors.Should().BeEmpty();
    }
}
