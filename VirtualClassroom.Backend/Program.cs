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
using Hangfire;
using Hangfire.Redis.StackExchange;
using Microsoft.FeatureManagement;
using OpenTelemetry.Exporter;
using Polly;
using Polly.Extensions.Http;
using VirtualClassroom.Api.Hubs;
using VirtualClassroom.Api.Infrastructure;
using VirtualClassroom.Api.Middleware;
using VirtualClassroom.Application;
using VirtualClassroom.Infrastructure;
using VirtualClassroom.Infrastructure.Identity;
using VirtualClassroom.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

// Enterprise: User Secrets in Development (avoid committing secrets)
if (builder.Environment.IsDevelopment())
    builder.Configuration.AddUserSecrets<Program>(optional: true);

// Railway and similar platforms set PORT; use it so the app listens on the correct port.
var port = Environment.GetEnvironmentVariable("PORT");
builder.WebHost.UseUrls(port is { Length: > 0 } ? $"http://+:{port}" : "http://+:8080");

// Enterprise: Serilog with Console, File, and optional Seq
builder.Host.UseSerilog((ctx, lc) =>
{
    lc.ReadFrom.Configuration(ctx.Configuration)
      .Enrich.FromLogContext()
      .WriteTo.Console();
    if (!string.IsNullOrWhiteSpace(ctx.Configuration["Serilog:File:Path"]))
        lc.WriteTo.File(ctx.Configuration["Serilog:File:Path"]!, rollingInterval: RollingInterval.Day, retainedFileCountLimit: 7);
    var seqUrl = ctx.Configuration["Serilog:Seq:ServerUrl"];
    if (!string.IsNullOrWhiteSpace(seqUrl))
        lc.WriteTo.Seq(seqUrl!);
});

// Enterprise: OpenTelemetry with optional OTLP exporter (Jaeger, etc.)
var otlpEndpoint = builder.Configuration["OpenTelemetry:Otlp:Endpoint"];
builder.Services.AddOpenTelemetry()
    .WithTracing(t =>
    {
        t.AddAspNetCoreInstrumentation()
         .AddHttpClientInstrumentation()
         .AddSource("VirtualClassroom");
        if (!string.IsNullOrEmpty(otlpEndpoint))
            t.AddOtlpExporter(o => o.Endpoint = new Uri(otlpEndpoint));
    })
    .WithMetrics(m =>
    {
        m.AddAspNetCoreInstrumentation()
         .AddHttpClientInstrumentation();
        if (!string.IsNullOrEmpty(otlpEndpoint))
            m.AddOtlpExporter(o => o.Endpoint = new Uri(otlpEndpoint));
    });

// Enterprise: Resilient HttpClient (Polly retry + circuit breaker)
static IAsyncPolicy<HttpResponseMessage> GetRetryPolicy() =>
    HttpPolicyExtensions.HandleTransientHttpError()
        .WaitAndRetryAsync(3, retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)));
static IAsyncPolicy<HttpResponseMessage> GetCircuitBreakerPolicy() =>
    HttpPolicyExtensions.HandleTransientHttpError()
        .CircuitBreakerAsync(5, TimeSpan.FromSeconds(30));
builder.Services.AddHttpClient("Resilient")
    .AddPolicyHandler(GetRetryPolicy())
    .AddPolicyHandler(GetCircuitBreakerPolicy());

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddSingleton<IConfiguration>(builder.Configuration);

var jwtSettings = builder.Configuration.GetSection("JwtSettings");
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
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

// Enterprise: Hangfire for background jobs (Redis storage when not in-memory)
if (!useInMemory && builder.Configuration.GetValue<bool>("Hangfire:Enabled"))
{
    var redisConn = builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379";
    builder.Services.AddHangfire(config => config
        .SetDataCompatibilityLevel(Hangfire.CompatibilityLevel.Version_180)
        .UseSimpleAssemblyNameTypeSerializer()
        .UseRecommendedSerializerSettings()
        .UseRedisStorage(redisConn));
    builder.Services.AddHangfireServer();
}

// Enterprise: Feature flags (config-based; can swap for LaunchDarkly/Azure App Config)
builder.Services.AddFeatureManagement();

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
// Liveness: used by Railway/orchestrators to know the process is up (no DB/Redis).
healthBuilder.AddCheck("live", () => Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult.Healthy(), tags: new[] { "live" });
if (useInMemory)
    healthBuilder.AddDbContextCheck<ApplicationDbContext>("database", tags: new[] { "ready" });
else
{
    healthBuilder.AddNpgSql(builder.Configuration.GetConnectionString("DefaultConnection")!, name: "postgres", tags: new[] { "ready" });
    healthBuilder.AddRedis(builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379", name: "redis", tags: new[] { "ready" });
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
// Enterprise: Security headers including CSP
app.Use(async (ctx, next) =>
{
    ctx.Response.Headers["X-Content-Type-Options"] = "nosniff";
    ctx.Response.Headers["X-Frame-Options"] = "DENY";
    ctx.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    ctx.Response.Headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none';";
    ctx.Response.Headers["Permissions-Policy"] = "geolocation=(), microphone=(self), camera=(self)";
    await next(ctx);
});

// Enterprise: Audit logging (who, what, when) for compliance
app.UseMiddleware<AuditLoggingMiddleware>();

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
        var logger = ctx.RequestServices.GetRequiredService<Serilog.ILogger>();
        logger.Error(err, "Unhandled exception: {Path}", ctx.Request.Path);

        ctx.Response.Clear();
        ctx.Response.ContentType = "application/json";
        if (err is FluentValidation.ValidationException validationEx)
        {
            ctx.Response.StatusCode = (int)HttpStatusCode.BadRequest;
            var errors = validationEx.Errors.Select(e => new { e.PropertyName, e.ErrorMessage });
            await ctx.Response.WriteAsJsonAsync(new { type = "ValidationError", status = 400, title = "Validation Failed", message = "Validation failed", errors });
        }
        else if (err is InvalidOperationException opEx)
        {
            ctx.Response.StatusCode = (int)HttpStatusCode.BadRequest;
            await ctx.Response.WriteAsJsonAsync(new { type = "BadRequest", status = 400, title = "Bad Request", message = opEx.Message });
        }
        else if (err is UnauthorizedAccessException authEx)
        {
            ctx.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
            await ctx.Response.WriteAsJsonAsync(new { type = "Unauthorized", status = 401, title = "Unauthorized", message = authEx.Message });
        }
        else if (IsDatabaseException(err))
        {
            ctx.Response.StatusCode = (int)HttpStatusCode.ServiceUnavailable;
            var msg = app.Environment.IsDevelopment() ? err.Message : "Database unavailable. Check connection and migrations.";
            await ctx.Response.WriteAsJsonAsync(new { type = "ServiceUnavailable", status = 503, title = "Service Unavailable", message = msg, detail = app.Environment.IsDevelopment() ? err.ToString() : (object?)null });
        }
        else
        {
            ctx.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
            var msg = app.Environment.IsDevelopment() ? err.ToString() : "An error occurred";
            await ctx.Response.WriteAsJsonAsync(new { type = "InternalServerError", status = 500, title = "Internal Server Error", message = "An error occurred", detail = msg });
        }
    }
});

static bool IsDatabaseException(Exception ex)
{
    var t = ex.GetType();
    var name = t.FullName ?? t.Name;
    return name.StartsWith("Npgsql.", StringComparison.Ordinal)
        || name.StartsWith("Microsoft.EntityFrameworkCore.", StringComparison.Ordinal)
        || (ex.InnerException != null && IsDatabaseException(ex.InnerException));
}

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
// /health = liveness only (Railway/orchestrators); /health/ready = postgres + redis.
app.MapHealthChecks("/health", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions { Predicate = reg => reg.Tags.Contains("live") });
app.MapHealthChecks("/health/ready", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions { Predicate = reg => reg.Tags.Contains("ready") });

// Enterprise: Hangfire dashboard (when enabled; protect in production with auth)
if (!useInMemory && builder.Configuration.GetValue<bool>("Hangfire:Enabled"))
    app.MapHangfireDashboard("/hangfire", new Hangfire.DashboardOptions { Authorization = new[] { new HangfireAuthorizationFilter() } });

using (var scope = app.Services.CreateScope())
{
    try
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
    catch (Exception ex)
    {
        // Log but do not block startup so Railway healthcheck can succeed; fix DB config and redeploy.
        var logger = scope.ServiceProvider.GetRequiredService<Serilog.ILogger>();
        logger.Warning(ex, "Database migration or seed failed; app will start but may be degraded.");
    }
}

app.Run();

// Expose entry point for WebApplicationFactory in integration tests.
public partial class Program { }
