using System.Diagnostics;
using Serilog;
using Serilog.Context;

namespace VirtualClassroom.Api.Middleware;

/// <summary>
/// Enterprise audit: logs authenticated requests (who, what, when) for compliance.
/// </summary>
public sealed class AuditLoggingMiddleware
{
    private readonly RequestDelegate _next;

    public AuditLoggingMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        var userId = context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "anonymous";
        var path = context.Request.Path.Value ?? "";
        var method = context.Request.Method;
        var requestId = context.Response.Headers["X-Request-ID"].FirstOrDefault() ?? "";

        using (LogContext.PushProperty("AuditUserId", userId))
        using (LogContext.PushProperty("AuditPath", path))
        using (LogContext.PushProperty("AuditMethod", method))
        {
            var sw = Stopwatch.StartNew();
            await _next(context);
            sw.Stop();
            if (context.Response.StatusCode >= 400)
                Log.Warning("Audit: {Method} {Path} -> {StatusCode} in {ElapsedMs}ms [RequestId={RequestId}]", method, path, context.Response.StatusCode, sw.ElapsedMilliseconds, requestId);
        }
    }
}
