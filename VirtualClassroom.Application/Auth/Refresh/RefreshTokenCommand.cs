using MediatR;

namespace VirtualClassroom.Application.Auth.Refresh;

public record RefreshTokenCommand(string RefreshToken) : IRequest<AuthResponse>;
