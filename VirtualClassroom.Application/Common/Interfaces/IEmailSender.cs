namespace VirtualClassroom.Application.Common.Interfaces;

/// <summary>
/// Abstraction for sending email (enterprise notifications). Implement with SendGrid, SMTP, etc.
/// </summary>
public interface IEmailSender
{
    Task SendAsync(string to, string subject, string htmlBody, CancellationToken cancellationToken = default);
}
