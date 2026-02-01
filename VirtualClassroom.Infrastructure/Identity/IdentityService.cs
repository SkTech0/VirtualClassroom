using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using VirtualClassroom.Application.Common.Interfaces;
using VirtualClassroom.Domain.Common;
using VirtualClassroom.Infrastructure.Identity;

namespace VirtualClassroom.Infrastructure.Identity;

public sealed class IdentityService(
    UserManager<ApplicationUser> userManager,
    RoleManager<IdentityRole<Guid>> roleManager) : IIdentityService
{
    public async Task<(bool Succeeded, string? UserId, IList<string> Errors)> RegisterAsync(string email, string username, string password)
    {
        var user = new ApplicationUser
        {
            UserName = username,
            Email = email,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var result = await userManager.CreateAsync(user, password);
        if (!result.Succeeded)
            return (false, null, result.Errors.Select(e => e.Description).ToList());

        await EnsureRoleExistsAsync(Roles.Student);
        await userManager.AddToRoleAsync(user, Roles.Student);

        return (true, user.Id.ToString(), Array.Empty<string>());
    }

    public async Task<(bool Succeeded, string? UserId, string? Email, string? Username, IList<string>? Roles)> ValidateCredentialsAsync(string email, string password)
    {
        var user = await userManager.FindByEmailAsync(email);
        if (user is null)
            return (false, null, null, null, null);

        var isValid = await userManager.CheckPasswordAsync(user, password);
        if (!isValid)
            return (false, null, null, null, null);

        var roles = await userManager.GetRolesAsync(user);
        return (true, user.Id.ToString(), user.Email, user.UserName, roles);
    }

    public async Task<UserInfoDto?> GetUserInfoAsync(string userId)
    {
        var user = await userManager.FindByIdAsync(userId);
        if (user is null) return null;

        var roles = await userManager.GetRolesAsync(user);
        return new UserInfoDto(user.UserName ?? "User", user.Email ?? "", roles);
    }

    private async Task EnsureRoleExistsAsync(string role)
    {
        if (!await roleManager.RoleExistsAsync(role))
            await roleManager.CreateAsync(new IdentityRole<Guid>(role));
    }
}
