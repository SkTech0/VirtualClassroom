using MediatR;

namespace VirtualClassroom.Application.Auth.Register;

public record RegisterCommand(string Email, string Username, string Password) : IRequest<AuthResponse>;
