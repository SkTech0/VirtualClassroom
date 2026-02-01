using MediatR;
using VirtualClassroom.Application.Common.Interfaces;

namespace VirtualClassroom.Application.Auth.Me;

public sealed class GetCurrentUserQueryHandler(IIdentityService identityService)
    : IRequestHandler<GetCurrentUserQuery, CurrentUserResponse>
{
    public async Task<CurrentUserResponse> Handle(GetCurrentUserQuery request, CancellationToken ct)
    {
        var userInfo = await identityService.GetUserInfoAsync(request.UserId);
        if (userInfo is null)
            throw new InvalidOperationException("User not found");

        return new CurrentUserResponse(
            userInfo.Username,
            userInfo.Email,
            userInfo.Roles.FirstOrDefault() ?? "Student");
    }
}
