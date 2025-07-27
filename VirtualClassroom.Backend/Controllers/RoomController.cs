using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Threading.Tasks;
using VirtualClassroom.Backend.DTOs.Room;
using VirtualClassroom.Backend.Services.Interfaces;
using Microsoft.AspNetCore.SignalR;
using VirtualClassroom.Backend.Hubs;

namespace VirtualClassroom.Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class RoomController : ControllerBase
    {
        private readonly IRoomService _roomService;
        private readonly IHubContext<RoomHub> _hubContext;

        public RoomController(IRoomService roomService, IHubContext<RoomHub> hubContext)
        {
            _roomService = roomService;
            _hubContext = hubContext;
        }

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateRoomDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var response = await _roomService.CreateRoomAsync(userId, dto);
            return Ok(response);
        }

        [HttpPost("join")]
        public async Task<IActionResult> Join([FromBody] JoinRoomDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var response = await _roomService.JoinRoomAsync(userId, dto);
            return Ok(response);
        }

        [HttpPost("leave")]
        public async Task<IActionResult> Leave([FromBody] JoinRoomDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            await _roomService.LeaveRoomAsync(userId, dto.Code);
            return NoContent();
        }

        [HttpGet("{code}")]
        public async Task<IActionResult> GetByCode(string code)
        {
            var response = await _roomService.GetRoomByCodeAsync(code);
            return Ok(response);
        }

        [HttpGet("{code}/participants")]
        public async Task<IActionResult> GetParticipants(string code)
        {
            var participants = await _roomService.GetParticipantsAsync(code);
            return Ok(participants);
        }

        [HttpPost("knock-knock")]
        public async Task<IActionResult> KnockKnock([FromBody] KnockKnockDto dto)
        {
            var fromUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            await _hubContext.Clients.Group(dto.RoomCode).SendAsync("KnockKnockReceived", dto.TargetUserId, fromUserId);
            return Ok();
        }

        [HttpPost("reminder")]
        public async Task<IActionResult> SendReminder([FromBody] ReminderDto dto)
        {
            await _hubContext.Clients.Group(dto.RoomCode).SendAsync("ReminderReceived", dto.Message);
            return Ok();
        }
    }
} 