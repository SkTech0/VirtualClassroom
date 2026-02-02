using VirtualClassroom.Application.Rooms.JoinRoom;

namespace VirtualClassroom.Tests.Unit.Application.Rooms;

public sealed class JoinRoomCommandValidatorTests
{
    private readonly JoinRoomCommandValidator _validator = new();

    [Fact]
    public void Code_Empty_ShouldHaveValidationError()
    {
        var result = _validator.Validate(new JoinRoomCommand(Guid.NewGuid().ToString(), ""));
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == nameof(JoinRoomCommand.Code) && e.ErrorMessage == "Room code is required");
    }

    [Fact]
    public void Code_NotSixChars_ShouldHaveValidationError()
    {
        var result = _validator.Validate(new JoinRoomCommand(Guid.NewGuid().ToString(), "ABC12"));
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == nameof(JoinRoomCommand.Code) && e.ErrorMessage == "Room code must be exactly 6 characters");
    }

    [Fact]
    public void Code_NonAlphanumeric_ShouldHaveValidationError()
    {
        var result = _validator.Validate(new JoinRoomCommand(Guid.NewGuid().ToString(), "ABC-12"));
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == nameof(JoinRoomCommand.Code) && e.ErrorMessage == "Room code must be alphanumeric");
    }

    [Fact]
    public void UserId_Empty_ShouldHaveValidationError()
    {
        var result = _validator.Validate(new JoinRoomCommand("", "ABC123"));
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == nameof(JoinRoomCommand.UserId) && e.ErrorMessage == "User is required");
    }

    [Theory]
    [InlineData("ABC123")]
    [InlineData("XYZ999")]
    [InlineData("A1B2C3")]
    public void ValidInput_ShouldNotHaveErrors(string code)
    {
        var result = _validator.Validate(new JoinRoomCommand(Guid.NewGuid().ToString(), code));
        result.IsValid.Should().BeTrue();
        result.Errors.Should().BeEmpty();
    }
}
