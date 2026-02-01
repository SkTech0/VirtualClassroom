using MediatR;
using VirtualClassroom.Application.Auth;
using VirtualClassroom.Application.Common.Interfaces;

namespace VirtualClassroom.Application.Auth.Login;

public sealed class LoginCommandHandler(
    IIdentityService identityService,
    IAuthTokenService tokenService)
    : IRequestHandler<LoginCommand, AuthResponse>
{
    public async Task<AuthResponse> Handle(LoginCommand request, CancellationToken ct)
    {
        var (succeeded, userId, email, username, _) = await identityService.ValidateCredentialsAsync(
            request.Email, request.Password);

        if (!succeeded || userId is null || email is null || username is null)
            throw new UnauthorizedAccessException("Invalid email or password");

        var userInfo = await identityService.GetUserInfoAsync(userId!);
        if (userInfo is null)
            throw new UnauthorizedAccessException("User info not found");

        var tokens = await tokenService.GenerateTokensAsync(
            userId!, email, username, userInfo.Roles);

        return new AuthResponse(
            tokens.AccessToken,
            tokens.RefreshToken,
            tokens.ExpiresInSeconds,
            tokens.ExpiresAt,
            username,
            email,
            userInfo.Roles.FirstOrDefault() ?? "Student");
    }
}
