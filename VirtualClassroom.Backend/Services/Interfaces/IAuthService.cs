using System.Threading.Tasks;
using VirtualClassroom.Backend.DTOs.Auth;
using VirtualClassroom.Backend.Models;
using Microsoft.AspNetCore.Http;

namespace VirtualClassroom.Backend.Services.Interfaces
{
    public interface IAuthService
    {
        Task<AuthResponseDto> RegisterAsync(RegisterDto dto);
        Task<AuthResponseDto> LoginAsync(LoginDto dto);
        Task<AuthResponseDto> GetCurrentUserAsync(string userId);
    }
}