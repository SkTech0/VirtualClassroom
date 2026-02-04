using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using VirtualClassroom.Application.Common.Interfaces;

namespace VirtualClassroom.Api.Hubs;

[Authorize]
public class RoomHub : Hub
{
    private readonly IRoomParticipantRepository _participantRepository;

    public RoomHub(IRoomParticipantRepository participantRepository)
    {
        _participantRepository = participantRepository;
    }

    /// <summary>
    /// Ensures the current user is an active participant of the room. Throws HubException if not.
    /// </summary>
    private async Task EnsureUserIsRoomMemberAsync(string normalizedRoomCode, CancellationToken ct = default)
    {
        var userId = Context.UserIdentifier;
        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
            throw new HubException("Invalid user context.");

        var participants = await _participantRepository.GetActiveParticipantsAsync(normalizedRoomCode, ct);
        var isMember = participants.Any(p => p.UserId == userGuid);
        if (!isMember)
            throw new HubException("You must join the room first before accessing it.");
    }

    public async Task StartTimer(string roomCode, int durationSeconds)
    {
        var code = NormalizeRoomCode(roomCode);
        await EnsureUserIsRoomMemberAsync(code);
        await Clients.Group(code).SendAsync("TimerStarted", durationSeconds);
    }

    public async Task PauseTimer(string roomCode)
    {
        var code = NormalizeRoomCode(roomCode);
        await EnsureUserIsRoomMemberAsync(code);
        await Clients.Group(code).SendAsync("TimerPaused");
    }

    public async Task ResumeTimer(string roomCode)
    {
        var code = NormalizeRoomCode(roomCode);
        await EnsureUserIsRoomMemberAsync(code);
        await Clients.Group(code).SendAsync("TimerResumed");
    }

    public async Task ResetTimer(string roomCode)
    {
        var code = NormalizeRoomCode(roomCode);
        await EnsureUserIsRoomMemberAsync(code);
        await Clients.Group(code).SendAsync("TimerReset");
    }

    public async Task UpdateStatus(string roomCode, string userId, string status)
    {
        var code = NormalizeRoomCode(roomCode);
        await EnsureUserIsRoomMemberAsync(code);
        await Clients.Group(code).SendAsync("UserStatusUpdated", userId, status);
    }

    public async Task SendKnockKnock(string roomCode, string targetUserId, string fromUserId)
    {
        var code = NormalizeRoomCode(roomCode);
        await EnsureUserIsRoomMemberAsync(code);
        await Clients.Group(code).SendAsync("KnockKnockReceived", targetUserId, fromUserId);
    }

    public async Task SendReminder(string roomCode, string message)
    {
        var code = NormalizeRoomCode(roomCode);
        await EnsureUserIsRoomMemberAsync(code);
        await Clients.Group(code).SendAsync("ReminderReceived", message);
    }

    public async Task SendMessage(string roomCode, string user, string message)
    {
        var code = NormalizeRoomCode(roomCode);
        await EnsureUserIsRoomMemberAsync(code);
        var timestamp = DateTime.UtcNow.ToString("o");
        await Clients.Group(code).SendAsync("ReceiveMessage", new { user, message, timestamp });
    }

    public async Task NotifyParticipantChange(string roomCode)
    {
        var code = NormalizeRoomCode(roomCode);
        await EnsureUserIsRoomMemberAsync(code);
        await Clients.Group(code).SendAsync("ParticipantsChanged");
    }

    private static string NormalizeRoomCode(string? code) =>
        string.IsNullOrWhiteSpace(code) ? string.Empty : code.Trim().ToUpperInvariant();

    public override async Task OnConnectedAsync()
    {
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.UserIdentifier;
        if (!string.IsNullOrEmpty(userId))
        {
            await Clients.All.SendAsync("UserDisconnected", userId);
        }
        await base.OnDisconnectedAsync(exception);
    }

    public async Task JoinRoomGroup(string roomCode)
    {
        var code = NormalizeRoomCode(roomCode);
        await EnsureUserIsRoomMemberAsync(code);
        await Groups.AddToGroupAsync(Context.ConnectionId, code);
    }

    public async Task LeaveRoomGroup(string roomCode)
    {
        var code = NormalizeRoomCode(roomCode);
        await EnsureUserIsRoomMemberAsync(code);
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, code);
    }
}
