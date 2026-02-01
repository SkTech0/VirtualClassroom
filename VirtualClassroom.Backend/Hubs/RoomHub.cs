using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using VirtualClassroom.Application.Common.Interfaces;

namespace VirtualClassroom.Api.Hubs;

[Authorize]
public class RoomHub : Hub
{
    private readonly IVideoSessionRepository _videoSessionRepository;
    private readonly IRoomCloser _roomCloser;

    public RoomHub(
        IVideoSessionRepository videoSessionRepository,
        IRoomCloser roomCloser)
    {
        _videoSessionRepository = videoSessionRepository;
        _roomCloser = roomCloser;
    }

    public async Task StartTimer(string roomCode, int durationSeconds)
    {
        await Clients.Group(roomCode).SendAsync("TimerStarted", durationSeconds);
    }

    public async Task PauseTimer(string roomCode)
    {
        await Clients.Group(roomCode).SendAsync("TimerPaused");
    }

    public async Task ResumeTimer(string roomCode)
    {
        await Clients.Group(roomCode).SendAsync("TimerResumed");
    }

    public async Task ResetTimer(string roomCode)
    {
        await Clients.Group(roomCode).SendAsync("TimerReset");
    }

    public async Task UpdateStatus(string roomCode, string userId, string status)
    {
        await Clients.Group(roomCode).SendAsync("UserStatusUpdated", userId, status);
    }

    public async Task SendKnockKnock(string roomCode, string targetUserId, string fromUserId)
    {
        await Clients.Group(roomCode).SendAsync("KnockKnockReceived", targetUserId, fromUserId);
    }

    public async Task SendReminder(string roomCode, string message)
    {
        await Clients.Group(roomCode).SendAsync("ReminderReceived", message);
    }

    public async Task SendMessage(string roomCode, string user, string message)
    {
        var timestamp = DateTime.UtcNow.ToString("o");
        await Clients.Group(roomCode).SendAsync("ReceiveMessage", new { user, message, timestamp });
    }

    public async Task NotifyParticipantChange(string roomCode)
    {
        await Clients.Group(roomCode).SendAsync("ParticipantsChanged");
    }

    public async Task JoinVideoCall(string roomCode)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, roomCode);

        var userId = Context.UserIdentifier;
        var username = Context.User?.Identity?.Name ?? "Unknown User";

        if (!string.IsNullOrEmpty(userId) && Guid.TryParse(userId, out var userGuid))
        {
            var session = new Domain.Entities.VideoSession
            {
                RoomCode = roomCode,
                UserId = userGuid,
                Username = username,
                ConnectionId = Context.ConnectionId!
            };
            await _videoSessionRepository.JoinAsync(session);
        }

        var videoSessions = await _videoSessionRepository.GetActiveByRoomAsync(roomCode);
        var videoParticipants = videoSessions.Select(v => new
        {
            userId = v.UserId.ToString(),
            v.Username,
            v.IsVideoEnabled,
            v.IsAudioEnabled
        }).ToList();

        await Clients.Caller.SendAsync("ExistingVideoParticipants", videoParticipants);
        await Clients.Group(roomCode).SendAsync("UserJoinedVideo", userId, username);
    }

    public async Task LeaveVideoCall(string roomCode)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomCode);

        var userId = Context.UserIdentifier;
        if (!string.IsNullOrEmpty(userId) && Guid.TryParse(userId, out var userGuid))
        {
            await _videoSessionRepository.LeaveAsync(roomCode, userGuid);
        }

        await Clients.Group(roomCode).SendAsync("UserLeftVideo", userId);

        var videoActive = await GetVideoActiveCount(roomCode);
        if (videoActive == 0)
        {
            await _roomCloser.CloseRoomAsync(roomCode);
            await Clients.Group(roomCode).SendAsync("RoomClosed");
        }
    }

    private async Task<int> GetVideoActiveCount(string roomCode)
    {
        var sessions = await _videoSessionRepository.GetActiveByRoomAsync(roomCode);
        return sessions.Count;
    }

    public async Task SendVideoOffer(string roomCode, string targetUserId, object offer)
    {
        var fromUserId = Context.UserIdentifier;
        await Clients.Group(roomCode).SendAsync("VideoOffer", new { from = fromUserId, to = targetUserId, offer });
    }

    public async Task SendVideoAnswer(string roomCode, string targetUserId, object answer)
    {
        var fromUserId = Context.UserIdentifier;
        await Clients.Group(roomCode).SendAsync("VideoAnswer", new { from = fromUserId, to = targetUserId, answer });
    }

    public async Task SendVideoIceCandidate(string roomCode, string targetUserId, object candidate)
    {
        var fromUserId = Context.UserIdentifier;
        await Clients.Group(roomCode).SendAsync("VideoIceCandidate", new { from = fromUserId, to = targetUserId, candidate });
    }

    public async Task ToggleVideo(string roomCode, bool isVideoEnabled)
    {
        var userId = Context.UserIdentifier;
        if (!string.IsNullOrEmpty(userId) && Guid.TryParse(userId, out var userGuid))
        {
            await _videoSessionRepository.UpdateStateAsync(roomCode, userGuid, isVideoEnabled, true);
        }
        await Clients.Group(roomCode).SendAsync("VideoToggle", new { userId, isVideoEnabled });
    }

    public async Task ToggleAudio(string roomCode, bool isAudioEnabled)
    {
        var userId = Context.UserIdentifier;
        if (!string.IsNullOrEmpty(userId) && Guid.TryParse(userId, out var userGuid))
        {
            await _videoSessionRepository.UpdateStateAsync(roomCode, userGuid, true, isAudioEnabled);
        }
        await Clients.Group(roomCode).SendAsync("AudioToggle", new { userId, isAudioEnabled });
    }

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
        await Groups.AddToGroupAsync(Context.ConnectionId, roomCode);
    }

    public async Task LeaveRoomGroup(string roomCode)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomCode);
    }
}
