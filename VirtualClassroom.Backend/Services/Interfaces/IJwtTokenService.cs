using System.Threading.Tasks;
using VirtualClassroom.Backend.Models;

namespace VirtualClassroom.Backend.Services.Interfaces
{
    public interface IJwtTokenService
    {
        Task<string> GenerateTokenAsync(ApplicationUser user);
    }
} 