using System;

using System.Linq;

using System.Threading.Tasks;

using Microsoft.AspNetCore.Identity;

using Microsoft.EntityFrameworkCore;

using VirtualClassroom.Backend.Data;

using VirtualClassroom.Backend.DTOs.Room;

using VirtualClassroom.Backend.Models;

using VirtualClassroom.Backend.Services.Interfaces;

 

namespace VirtualClassroom.Backend.Services

{

    public class RoomService : IRoomService

    {

        private readonly ApplicationDbContext _dbContext;

        private readonly UserManager<ApplicationUser> _userManager;

        private static readonly Random _random = new Random();

 

        public RoomService(ApplicationDbContext dbContext, UserManager<ApplicationUser> userManager)

        {

            _dbContext = dbContext;

            _userManager = userManager;

        }

 

        public async Task<RoomResponseDto> CreateRoomAsync(string hostUserId, CreateRoomDto dto)

        {

            var hostUser = await _userManager.FindByIdAsync(hostUserId);

            if (hostUser == null) throw new Exception("Host user not found");

 

            string code;

            do

            {

                code = GenerateRoomCode();

            } while (await _dbContext.Rooms.AnyAsync(r => r.Code == code));

 

            var room = new Room

            {

                Id = Guid.NewGuid(),

                Code = code,

                Subject = dto.Subject,

                HostUserId = hostUser.Id,

                IsActive = true,

                CreatedAt = DateTime.UtcNow

            };

            _dbContext.Rooms.Add(room);

            await _dbContext.SaveChangesAsync();

 

            // Add host as a participant (session)

            var session = new Session

            {

                Id = Guid.NewGuid(),

                UserId = hostUser.Id,

                RoomId = room.Id,

                JoinedAt = DateTime.UtcNow,

                Status = "active"

            };

            _dbContext.Sessions.Add(session);

            await _dbContext.SaveChangesAsync();

 

            return MapToRoomResponseDto(room, hostUser.UserName);

        }

 

        public async Task<RoomResponseDto> JoinRoomAsync(string userId, JoinRoomDto dto)

        {

            var user = await _userManager.FindByIdAsync(userId);

            if (user == null) throw new Exception("User not found");

 

            var room = await _dbContext.Rooms.FirstOrDefaultAsync(r => r.Code == dto.Code && r.IsActive);

            if (room == null) throw new Exception("Room not found or inactive");

 

            // Check if already joined

            var existingSession = await _dbContext.Sessions.FirstOrDefaultAsync(s => s.UserId == user.Id && s.RoomId == room.Id && s.LeftAt == null);

            if (existingSession != null) throw new Exception("Already joined this room");

 

            var session = new Session

            {

                Id = Guid.NewGuid(),

                UserId = user.Id,

                RoomId = room.Id,

                JoinedAt = DateTime.UtcNow,

                Status = "active"

            };

            _dbContext.Sessions.Add(session);

            await _dbContext.SaveChangesAsync();

 

            var hostUser = await _userManager.FindByIdAsync(room.HostUserId.ToString());

            return MapToRoomResponseDto(room, hostUser?.UserName ?? "");

        }

 

        public async Task LeaveRoomAsync(string userId, string roomCode)

        {

            var room = await _dbContext.Rooms.FirstOrDefaultAsync(r => r.Code == roomCode && r.IsActive);

            if (room == null) throw new Exception("Room not found or inactive");

 

            var session = await _dbContext.Sessions.FirstOrDefaultAsync(s => s.UserId.ToString() == userId && s.RoomId == room.Id && s.LeftAt == null);

            if (session == null) throw new Exception("Session not found");

 

            session.LeftAt = DateTime.UtcNow;

            session.Status = "left";

            await _dbContext.SaveChangesAsync();

        }

 

        public async Task<RoomResponseDto> GetRoomByCodeAsync(string roomCode)

        {

            var room = await _dbContext.Rooms.FirstOrDefaultAsync(r => r.Code == roomCode);

            if (room == null) throw new Exception("Room not found");

            var hostUser = await _userManager.FindByIdAsync(room.HostUserId.ToString());

            return MapToRoomResponseDto(room, hostUser?.UserName ?? "");

        }

 

        public async Task<List<UserDto>> GetParticipantsAsync(string roomCode)

        {

            var room = await _dbContext.Rooms.FirstOrDefaultAsync(r => r.Code == roomCode);

            if (room == null) throw new Exception("Room not found");

 

            var sessions = await _dbContext.Sessions

                .Where(s => s.RoomId == room.Id && s.LeftAt == null)

                .Include(s => s.User)

                .ToListAsync();

 

            return sessions.Select(s => new UserDto

            {

                Id = s.User.Id,

                Name = s.User.UserName,

                Email = s.User.Email

            }).ToList();

        }

 

        public async Task CloseRoomAsync(string roomCode)

        {

            var room = await _dbContext.Rooms.FirstOrDefaultAsync(r => r.Code == roomCode && r.IsActive);

            if (room == null) return;

            room.IsActive = false;

            // End all sessions

            var sessions = await _dbContext.Sessions.Where(s => s.RoomId == room.Id && s.LeftAt == null).ToListAsync();

            foreach (var session in sessions)

            {

                session.LeftAt = DateTime.UtcNow;

                session.Status = "closed";

            }

            // End all video sessions

            var videoSessions = await _dbContext.VideoSessions.Where(vs => vs.RoomCode == roomCode && vs.LeftAt == null).ToListAsync();

            foreach (var vs in videoSessions)

            {

                vs.LeftAt = DateTime.UtcNow;

            }

            await _dbContext.SaveChangesAsync();

        }

 

        private string GenerateRoomCode()

        {

            const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

            return new string(Enumerable.Repeat(chars, 6).Select(s => s[_random.Next(s.Length)]).ToArray());

        }

 

        private RoomResponseDto MapToRoomResponseDto(Room room, string hostUsername)

        {

            return new RoomResponseDto

            {

                Id = room.Id,

                Code = room.Code,

                Subject = room.Subject,

                HostUsername = hostUsername,

                IsActive = room.IsActive,

                CreatedAt = room.CreatedAt

            };

        }

    }

}

