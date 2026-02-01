using MediatR;
using VirtualClassroom.Application.Auth;
using VirtualClassroom.Application.Common.Interfaces;

namespace VirtualClassroom.Application.Auth.Register;

public sealed class RegisterCommandHandler(
    IIdentityService identityService,
    IAuthTokenService tokenService)
    : IRequestHandler<RegisterCommand, AuthResponse>
{
    public async Task<AuthResponse> Handle(RegisterCommand request, CancellationToken ct)
    {
        var (succeeded, userId, errors) = await identityService.RegisterAsync(
            request.Email, request.Username, request.Password);

        if (!succeeded || userId is null)
            throw new InvalidOperationException(string.Join("; ", errors ?? ["Registration failed"]));

        var userInfo = await identityService.GetUserInfoAsync(userId);
        if (userInfo is null)
            throw new InvalidOperationException("User created but info not found");

        var tokens = await tokenService.GenerateTokensAsync(
            userId, request.Email, userInfo.Username, userInfo.Roles);

        return new AuthResponse(
            tokens.AccessToken,
            tokens.RefreshToken,
            tokens.ExpiresInSeconds,
            tokens.ExpiresAt,
            userInfo.Username,
            request.Email,
            userInfo.Roles.FirstOrDefault() ?? "Student");
    }
}
