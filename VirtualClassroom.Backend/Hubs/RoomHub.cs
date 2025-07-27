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