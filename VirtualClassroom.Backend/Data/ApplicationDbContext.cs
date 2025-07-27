using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using VirtualClassroom.Backend.Models;

namespace VirtualClassroom.Backend.Data
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

        public DbSet<Room> Rooms { get; set; }
        public DbSet<Session> Sessions { get; set; }
        public DbSet<Pomodoro> Pomodoros { get; set; }
        public DbSet<LeaderboardEntry> LeaderboardEntries { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // ApplicationUser
            modelBuilder.Entity<ApplicationUser>()
                .HasIndex(u => u.Email)
                .IsUnique();
            modelBuilder.Entity<ApplicationUser>()
                .HasIndex(u => u.UserName)
                .IsUnique();

            // Room
            modelBuilder.Entity<Room>()
                .HasIndex(r => r.Code)
                .IsUnique();
            modelBuilder.Entity<Room>()
                .HasOne(r => r.HostUser)
                .WithMany()
                .HasForeignKey(r => r.HostUserId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<Room>()
                .HasMany(r => r.Sessions)
                .WithOne(s => s.Room)
                .HasForeignKey(s => s.RoomId);

            // Session
            modelBuilder.Entity<Session>()
                .HasOne(s => s.User)
                .WithMany()
                .HasForeignKey(s => s.UserId)
                .OnDelete(DeleteBehavior.Cascade);
                
            modelBuilder.Entity<Session>()
                .HasMany(s => s.Pomodoros)
                .WithOne(p => p.Session)
                .HasForeignKey(p => p.SessionId);

            // LeaderboardEntry
            modelBuilder.Entity<LeaderboardEntry>()
                .HasOne(l => l.User)
                .WithMany()
                .HasForeignKey(l => l.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
} 