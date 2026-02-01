using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using StackExchange.Redis;
using VirtualClassroom.Application.Common.Interfaces;
using VirtualClassroom.Infrastructure.Auth;
using VirtualClassroom.Infrastructure.Identity;
using VirtualClassroom.Infrastructure.Persistence;
using VirtualClassroom.Infrastructure.Persistence.Repositories;
using VirtualClassroom.Infrastructure.Video;

namespace VirtualClassroom.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var useInMemory = configuration.GetValue<bool>("UseInMemory");

        if (useInMemory)
        {
            var dbPath = Path.Combine(Path.GetTempPath(), "VirtualClassroom.db");
            services.AddDbContext<ApplicationDbContext>(options =>
            {
                options.UseSqlite($"Data Source={dbPath}");
            });
        }
        else
        {
            services.AddDbContext<ApplicationDbContext>(options =>
                options.UseNpgsql(configuration.GetConnectionString("DefaultConnection"),
                    npgsql => npgsql.MigrationsAssembly("VirtualClassroom.Backend")));
        }

        services.AddIdentity<ApplicationUser, IdentityRole<Guid>>(options =>
        {
            options.Password.RequireDigit = true;
            options.Password.RequireLowercase = true;
            options.Password.RequireUppercase = true;
            options.Password.RequireNonAlphanumeric = false;
            options.Password.RequiredLength = 8;
            options.User.RequireUniqueEmail = true;
        })
            .AddEntityFrameworkStores<ApplicationDbContext>()
            .AddDefaultTokenProviders();

        if (useInMemory)
        {
            services.AddSingleton<IAuthTokenService, InMemoryAuthTokenService>();
            services.AddMemoryCache();
        }
        else
        {
            var redisConnection = configuration.GetConnectionString("Redis") ?? "localhost:6379";
            services.AddSingleton<IConnectionMultiplexer>(_ =>
            {
                var config = ConfigurationOptions.Parse(redisConnection);
                return ConnectionMultiplexer.Connect(config);
            });
            services.AddStackExchangeRedisCache(options =>
            {
                options.Configuration = redisConnection;
            });
            services.AddScoped<IAuthTokenService, AuthTokenService>();
        }

        services.AddScoped<IRoomRepository, RoomRepository>();
        services.AddScoped<ISessionRepository, SessionRepository>();
        services.AddScoped<IPomodoroRepository, PomodoroRepository>();
        services.AddScoped<IVideoSessionRepository, VideoSessionRepository>();
        services.AddScoped<IRoomParticipantRepository, RoomParticipantRepository>();
        services.AddScoped<IRoomCloser, RoomCloser>();
        services.AddScoped<IIdentityService, IdentityService>();
        services.AddScoped<ILiveKitService, LiveKitService>();

        return services;
    }
}
