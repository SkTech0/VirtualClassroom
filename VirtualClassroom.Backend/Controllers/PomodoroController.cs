using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;
using VirtualClassroom.Backend.DTOs.Pomodoro;
using VirtualClassroom.Backend.Services.Interfaces;

namespace VirtualClassroom.Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PomodoroController : ControllerBase
    {
        private readonly IPomodoroService _pomodoroService;

        public PomodoroController(IPomodoroService pomodoroService)
        {
            _pomodoroService = pomodoroService;
        }

        [HttpPost("start")]
        public async Task<IActionResult> Start([FromBody] StartPomodoroDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var response = await _pomodoroService.StartPomodoroAsync(userId, dto);
            return Ok(response);
        }

        [HttpPost("end")]
        public async Task<IActionResult> End([FromBody] EndPomodoroDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var response = await _pomodoroService.EndPomodoroAsync(userId, dto);
            return Ok(response);
        }

        [HttpGet("session/{sessionId}")]
        public async Task<IActionResult> GetBySession(Guid sessionId)
        {
            var response = await _pomodoroService.GetPomodorosBySessionAsync(sessionId);
            return Ok(response);
        }
    }
} 