using Microsoft.AspNetCore.Hosting;
using Hangfire.Dashboard;

namespace VirtualClassroom.Api.Infrastructure;

/// <summary>
/// Restricts Hangfire dashboard: allow in Development; in Production require authentication (extend as needed).
/// </summary>
public sealed class HangfireAuthorizationFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        var httpContext = context.GetHttpContext();
        return httpContext.Request.Path.StartsWithSegments("/hangfire")
            && (httpContext.RequestServices.GetService<IWebHostEnvironment>()?.IsDevelopment() == true
                || httpContext.User.Identity?.IsAuthenticated == true);
    }
}
