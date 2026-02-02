using VirtualClassroom.Application.Common.Interfaces;

namespace VirtualClassroom.Infrastructure.Notifications;

/// <summary>
/// No-op email sender for development or when no provider is configured. Replace with SendGrid/SMTP in production.
/// </summary>
public sealed class NoOpEmailSender : IEmailSender
{
    public Task SendAsync(string to, string subject, string htmlBody, CancellationToken cancellationToken = default)
    {
        return Task.CompletedTask;
    }
}
