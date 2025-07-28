using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;
using System;

namespace VirtualClassroom.Backend.Hubs
{
    [Authorize]
    public class RoomHub : Hub
    {
        // Timer sync methods
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

        // User status update
        public async Task UpdateStatus(string roomCode, string userId, string status)
        {
            await Clients.Group(roomCode).SendAsync("UserStatusUpdated", userId, status);
        }

        // Knock-knock notification to a specific user
        public async Task SendKnockKnock(string roomCode, string targetUserId, string fromUserId)
        {
            await Clients.Group(roomCode).SendAsync("KnockKnockReceived", targetUserId, fromUserId);
        }

        // Reminder notification to all users in a room
        public async Task SendReminder(string roomCode, string message)
        {
            await Clients.Group(roomCode).SendAsync("ReminderReceived", message);
        }

        // Real-time chat
        public async Task SendMessage(string roomCode, string user, string message)
        {
            var timestamp = DateTime.UtcNow.ToString("o");
            await Clients.Group(roomCode).SendAsync("ReceiveMessage", new { user, message, timestamp });
        }

        // Notify group when a user joins/leaves
        public async Task NotifyParticipantChange(string roomCode)
        {
            await Clients.Group(roomCode).SendAsync("ParticipantsChanged");
        }

        // Video Conferencing Methods
        public async Task JoinVideoCall(string roomCode)
        {
            var userId = Context.UserIdentifier;
            var username = Context.User?.Identity?.Name ?? "Unknown User";
            
            await Clients.Group(roomCode).SendAsync("UserJoinedVideo", userId, username);
        }

        public async Task LeaveVideoCall(string roomCode)
        {
            var userId = Context.UserIdentifier;
            await Clients.Group(roomCode).SendAsync("UserLeftVideo", userId);
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
            await Clients.Group(roomCode).SendAsync("VideoToggle", new { userId, isVideoEnabled });
        }

        public async Task ToggleAudio(string roomCode, bool isAudioEnabled)
        {
            var userId = Context.UserIdentifier;
            await Clients.Group(roomCode).SendAsync("AudioToggle", new { userId, isAudioEnabled });
        }

        // Group management
        public override async Task OnConnectedAsync()
        {
            // Optionally: Add user to groups based on query string or context
            await base.OnConnectedAsync();
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
} 