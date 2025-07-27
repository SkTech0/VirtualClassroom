using System;

namespace VirtualClassroom.Backend.DTOs.Room
{
    public class RoomResponseDto
    {
        public Guid Id { get; set; }
        public string? Code { get; set; }
        public string? Subject { get; set; }
        public string? HostUsername { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }
} 