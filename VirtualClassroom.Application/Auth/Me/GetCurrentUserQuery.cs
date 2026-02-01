using MediatR;

namespace VirtualClassroom.Application.Auth.Me;

public record GetCurrentUserQuery(string UserId) : IRequest<CurrentUserResponse>;

public record CurrentUserResponse(string Username, string Email, string Role);
