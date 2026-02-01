using System.Threading.RateLimiting;
using System.Text;
using System.Net;
using Asp.Versioning;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using OpenTelemetry.Metrics;
using OpenTelemetry.Trace;
using Serilog;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using VirtualClassroom.Api.Hubs;
using VirtualClassroom.Application;
using VirtualClassroom.Infrastructure;
using VirtualClassroom.Infrastructure.Identity;
using VirtualClassroom.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((ctx, lc) =>
{
    lc.ReadFrom.Configuration(ctx.Configuration)
      .Enrich.FromLogContext()
      .WriteTo.Console();
});

builder.Services.AddOpenTelemetry()
    .WithTracing(t =>
    {
        t.AddAspNetCoreInstrumentation()
         .AddHttpClientInstrumentation()
         .AddSource("VirtualClassroom");
    })
    .WithMetrics(m =>
    {
        m.AddAspNetCoreInstrumentation()
         .AddHttpClientInstrumentation()
;
    });

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddSingleton<IConfiguration>(builder.Configuration);

var jwtSettings = builder.Configuration.GetSection("JwtSettings");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings["Issuer"],
            ValidAudience = jwtSettings["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["SecretKey"]!))
        };
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs/room"))
                    context.Token = accessToken;
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("Teacher", p => p.RequireRole("Teacher", "Admin"));
    options.AddPolicy("Admin", p => p.RequireRole("Admin"));
    options.AddPolicy("Student", p => p.RequireRole("Student", "Teacher", "Admin"));
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("Default", policy =>
    {
        policy.WithOrigins(builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? ["http://localhost:4200", "https://localhost:4200"])
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddRateLimiter(options =>
{
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
        RateLimitPartition.GetFixedWindowLimiter(
            ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                Window = TimeSpan.FromMinutes(1),
                PermitLimit = 100
            }));
    options.AddPolicy("auth", ctx =>
        RateLimitPartition.GetFixedWindowLimiter(
            ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                Window = TimeSpan.FromMinutes(1),
                PermitLimit = 10
            }));
});

builder.Services.AddHsts(options =>
{
    options.Preload = true;
    options.IncludeSubDomains = true;
    options.MaxAge = TimeSpan.FromDays(365);
});

builder.Services.AddControllers();
builder.Services.AddApiVersioning(options =>
{
    options.DefaultApiVersion = new ApiVersion(1, 0);
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.ReportApiVersions = true;
}).AddMvc().AddApiExplorer(options =>
{
    options.GroupNameFormat = "'v'VVV";
    options.SubstituteApiVersionInUrl = true;
});
var useInMemory = builder.Configuration.GetValue<bool>("UseInMemory");
var signalrBuilder = builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = builder.Environment.IsDevelopment();
});
if (!useInMemory)
    signalrBuilder.AddStackExchangeRedis(builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379");

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "Virtual Classroom API",
        Version = "v1",
        Description = "Enterprise Virtual Classroom - Rooms, Pomodoro, Video (LiveKit)"
    });
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Description = "JWT Bearer token (e.g., Bearer eyJ...)"
    });
    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        { new Microsoft.OpenApi.Models.OpenApiSecurityScheme { Reference = new Microsoft.OpenApi.Models.OpenApiReference { Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme, Id = "Bearer" } }, Array.Empty<string>() }
    });
});

var healthBuilder = builder.Services.AddHealthChecks();
if (useInMemory)
    healthBuilder.AddDbContextCheck<ApplicationDbContext>("database");
else
{
    healthBuilder.AddNpgSql(builder.Configuration.GetConnectionString("DefaultConnection")!, name: "postgres");
    healthBuilder.AddRedis(builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379", name: "redis");
}

var app = builder.Build();

// Request ID for correlation (add to response and log context)
app.Use(async (ctx, next) =>
{
    var requestId = ctx.Request.Headers["X-Request-ID"].FirstOrDefault()
        ?? Guid.NewGuid().ToString("N")[..12];
    ctx.Response.Headers["X-Request-ID"] = requestId;
    using (Serilog.Context.LogContext.PushProperty("RequestId", requestId))
        await next(ctx);
});

app.UseSerilogRequestLogging();

// Security headers (HSTS only in Production)
if (app.Environment.IsProduction())
{
    app.UseHsts();
    app.UseHttpsRedirection();
}
app.Use(async (ctx, next) =>
{
    ctx.Response.Headers["X-Content-Type-Options"] = "nosniff";
    ctx.Response.Headers["X-Frame-Options"] = "DENY";
    ctx.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    await next(ctx);
});

// Global exception handling: ValidationException -> 400, InvalidOperationException -> 400, others -> 500
app.Use(async (ctx, next) =>
{
    try
    {
        await next(ctx);
    }
    catch (Exception ex)
    {
        var err = ex is AggregateException agg ? agg.GetBaseException() : ex;
        ctx.Response.Clear();
        ctx.Response.ContentType = "application/json";
        if (err is FluentValidation.ValidationException validationEx)
        {
            ctx.Response.StatusCode = (int)HttpStatusCode.BadRequest;
            var errors = validationEx.Errors.Select(e => new { e.PropertyName, e.ErrorMessage });
            await ctx.Response.WriteAsJsonAsync(new { errors, message = "Validation failed" });
        }
        else if (err is InvalidOperationException opEx)
        {
            ctx.Response.StatusCode = (int)HttpStatusCode.BadRequest;
            await ctx.Response.WriteAsJsonAsync(new { message = opEx.Message });
        }
        else
        {
            ctx.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
            var msg = app.Environment.IsDevelopment() ? err.ToString() : "An error occurred";
            await ctx.Response.WriteAsJsonAsync(new { message = "An error occurred", detail = msg });
        }
    }
});
app.UseRateLimiter();
app.UseCors("Default");
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();

// Swagger only in non-Production (or when explicitly enabled)
var allowSwagger = app.Environment.IsDevelopment()
    || builder.Configuration.GetValue<bool>("EnableSwagger");
if (allowSwagger)
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Virtual Classroom API v1");
        c.RoutePrefix = string.Empty;
    });
}

app.MapControllers();
app.MapHub<RoomHub>("/hubs/room");
app.MapHealthChecks("/health");

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    if (useInMemory)
        await db.Database.EnsureCreatedAsync();
    else
        await db.Database.MigrateAsync();

    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<Microsoft.AspNetCore.Identity.IdentityRole<Guid>>>();
    foreach (var role in new[] { "Admin", "Teacher", "Student" })
    {
        if (!await roleManager.RoleExistsAsync(role))
            await roleManager.CreateAsync(new Microsoft.AspNetCore.Identity.IdentityRole<Guid>(role));
    }
}

app.Run();
