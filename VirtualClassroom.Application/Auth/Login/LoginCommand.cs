using MediatR;

namespace VirtualClassroom.Application.Auth.Login;

public record LoginCommand(string Email, string Password) : IRequest<AuthResponse>;
