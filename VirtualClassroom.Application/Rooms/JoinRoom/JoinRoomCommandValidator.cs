using FluentValidation;

namespace VirtualClassroom.Application.Rooms.JoinRoom;

public sealed class JoinRoomCommandValidator : AbstractValidator<JoinRoomCommand>
{
    public JoinRoomCommandValidator()
    {
        RuleFor(x => x.Code)
            .NotEmpty().WithMessage("Room code is required")
            .Length(6, 6).WithMessage("Room code must be exactly 6 characters")
            .Matches("^[A-Za-z0-9]+$").WithMessage("Room code must be alphanumeric");

        RuleFor(x => x.UserId)
            .NotEmpty().WithMessage("User is required");
    }
}
