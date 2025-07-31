using Microsoft.AspNetCore.Authorization;

using Microsoft.AspNetCore.SignalR;

using System.Threading.Tasks;

using System;

using VirtualClassroom.Backend.Services;

using VirtualClassroom.Backend.Services.Interfaces;

using System.Linq;

using Microsoft.Extensions.DependencyInjection;



namespace VirtualClassroom.Backend.Hubs

{

    [Authorize]

    public class RoomHub : Hub

    {

        private readonly IVideoSessionService _videoSessionService;



        public RoomHub(IVideoSessionService videoSessionService)

        {

            _videoSessionService = videoSessionService;

        }



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

            // Add to video call group

            await Groups.AddToGroupAsync(Context.ConnectionId, roomCode);



            var userId = Context.UserIdentifier;

            var username = Context.User?.Identity?.Name ?? "Unknown User";



            if (!string.IsNullOrEmpty(userId) && Guid.TryParse(userId, out var userGuid))

            {

                // Track video session in database

                await _videoSessionService.JoinVideoSessionAsync(roomCode, userGuid, username, Context.ConnectionId);

            }

            // Send all current participants to the new joiner

            var participants = await _videoSessionService.GetActiveVideoParticipantsAsync(roomCode);

            await Clients.Caller.SendAsync("ExistingVideoParticipants", participants);

            // Notify others about the new joiner

            await Clients.Group(roomCode).SendAsync("UserJoinedVideo", userId, username);

        }



        public async Task LeaveVideoCall(string roomCode)

        {

            // Remove from video call group

            await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomCode);



            var userId = Context.UserIdentifier;



            if (!string.IsNullOrEmpty(userId) && Guid.TryParse(userId, out var userGuid))

            {

                // Update video session in database

                await _videoSessionService.LeaveVideoSessionAsync(roomCode, userGuid);

            }

            await Clients.Group(roomCode).SendAsync("UserLeftVideo", userId);



            // Check if any users remain in the room (sessions or video sessions)

            var activeSessions = await _videoSessionService.GetActiveVideoParticipantsAsync(roomCode);

            if (activeSessions == null || !activeSessions.Any())

            {

                // Close the room and notify all

                var roomService = (VirtualClassroom.Backend.Services.RoomService)Context.GetHttpContext().RequestServices.GetService(typeof(VirtualClassroom.Backend.Services.RoomService));

                if (roomService != null)

                {

                    await roomService.CloseRoomAsync(roomCode);

                }

                await Clients.Group(roomCode).SendAsync("RoomClosed");

            }

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

                // Update video state in database

                await _videoSessionService.UpdateVideoStateAsync(roomCode, userGuid, isVideoEnabled, true);

            }



            await Clients.Group(roomCode).SendAsync("VideoToggle", new { userId, isVideoEnabled });

        }



        public async Task ToggleAudio(string roomCode, bool isAudioEnabled)

        {

            var userId = Context.UserIdentifier;



            if (!string.IsNullOrEmpty(userId) && Guid.TryParse(userId, out var userGuid))

            {

                // Update audio state in database

                await _videoSessionService.UpdateVideoStateAsync(roomCode, userGuid, true, isAudioEnabled);

            }



            await Clients.Group(roomCode).SendAsync("AudioToggle", new { userId, isAudioEnabled });

        }



        // Group management

        public override async Task OnConnectedAsync()

        {

            await base.OnConnectedAsync();

        }



        public override async Task OnDisconnectedAsync(Exception? exception)

        {

            // Handle disconnection - notify others that user left

            var userId = Context.UserIdentifier;

            if (!string.IsNullOrEmpty(userId))

            {

                // Notify all groups this user was in that they left

                // Note: In a production app, you'd track which groups the user was in

                await Clients.All.SendAsync("UserDisconnected", userId);



                // Clean up any active video sessions

                if (Guid.TryParse(userId, out var userGuid))

                {

                    // This would need to be enhanced to track which rooms the user was in

                    // For now, we'll rely on explicit LeaveVideoCall calls

                }

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

}

