using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using VirtualClassroom.Domain.Entities;
using VirtualClassroom.Infrastructure.Identity;

namespace VirtualClassroom.Infrastructure.Persistence;

public class ApplicationDbContext : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<Session> Sessions => Set<Session>();
    public DbSet<Pomodoro> Pomodoros => Set<Pomodoro>();
    public DbSet<LeaderboardEntry> LeaderboardEntries => Set<LeaderboardEntry>();
    public DbSet<VideoSession> VideoSessions => Set<VideoSession>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<ApplicationUser>(b =>
        {
            b.HasIndex(u => u.Email).IsUnique();
            b.HasIndex(u => u.UserName).IsUnique();
        });

        modelBuilder.Entity<Room>(b =>
        {
            b.HasIndex(r => r.Code).IsUnique();
            b.HasAlternateKey(r => r.Code);
            b.HasOne<ApplicationUser>()
                .WithMany()
                .HasForeignKey(r => r.HostUserId)
                .OnDelete(DeleteBehavior.Restrict);
            b.HasMany(r => r.Sessions)
                .WithOne()
                .HasForeignKey(s => s.RoomId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Session>(b =>
        {
            b.HasOne<ApplicationUser>()
                .WithMany()
                .HasForeignKey(s => s.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            b.HasMany(s => s.Pomodoros)
                .WithOne()
                .HasForeignKey(p => p.SessionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<LeaderboardEntry>(b =>
        {
            b.HasOne<ApplicationUser>()
                .WithMany()
                .HasForeignKey(l => l.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<VideoSession>(b =>
        {
            b.HasOne<Room>()
                .WithMany()
                .HasForeignKey(v => v.RoomCode)
                .HasPrincipalKey(r => r.Code)
                .OnDelete(DeleteBehavior.Cascade);
            b.HasOne<ApplicationUser>()
                .WithMany()
                .HasForeignKey(v => v.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
