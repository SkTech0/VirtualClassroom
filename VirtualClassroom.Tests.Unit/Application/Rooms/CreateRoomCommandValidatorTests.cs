using VirtualClassroom.Application.Rooms.CreateRoom;

namespace VirtualClassroom.Tests.Unit.Application.Rooms;

public sealed class CreateRoomCommandValidatorTests
{
    private readonly CreateRoomCommandValidator _validator = new();

    [Fact]
    public void Subject_Empty_ShouldHaveValidationError()
    {
        var result = _validator.Validate(new CreateRoomCommand(Guid.NewGuid().ToString(), ""));
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == nameof(CreateRoomCommand.Subject) && e.ErrorMessage == "Subject is required");
    }

    [Fact]
    public void Subject_TooLong_ShouldHaveValidationError()
    {
        var longSubject = new string('x', 201);
        var result = _validator.Validate(new CreateRoomCommand(Guid.NewGuid().ToString(), longSubject));
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == nameof(CreateRoomCommand.Subject) && e.ErrorMessage == "Subject must not exceed 200 characters");
    }

    [Fact]
    public void HostUserId_Empty_ShouldHaveValidationError()
    {
        var result = _validator.Validate(new CreateRoomCommand("", "Math"));
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == nameof(CreateRoomCommand.HostUserId) && e.ErrorMessage == "Host user is required");
    }

    [Theory]
    [InlineData("Math")]
    [InlineData("Physics 101")]
    public void ValidInput_ShouldNotHaveErrors(string subject)
    {
        var result = _validator.Validate(new CreateRoomCommand(Guid.NewGuid().ToString(), subject));
        result.IsValid.Should().BeTrue();
        result.Errors.Should().BeEmpty();
    }
}
