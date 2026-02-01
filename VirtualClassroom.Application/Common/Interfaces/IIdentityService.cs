namespace VirtualClassroom.Application.Common.Interfaces;

public interface IIdentityService
{
    Task<(bool Succeeded, string? UserId, IList<string> Errors)> RegisterAsync(string email, string username, string password);
    Task<(bool Succeeded, string? UserId, string? Email, string? Username, IList<string>? Roles)> ValidateCredentialsAsync(string email, string password);
    Task<UserInfoDto?> GetUserInfoAsync(string userId);
}

public record UserInfoDto(string Username, string Email, IList<string> Roles);
