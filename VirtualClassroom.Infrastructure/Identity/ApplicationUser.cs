using Microsoft.AspNetCore.Identity;

namespace VirtualClassroom.Infrastructure.Identity;

public class ApplicationUser : IdentityUser<Guid>
{
    public int StreakCount { get; set; }
    public int TotalSessions { get; set; }
    public bool IsPremium { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
