using System;

namespace VirtualClassroom.Backend.DTOs.Room
{
    public class UserDto
    {
        public Guid Id { get; set; }
        public string? Name { get; set; }
        public string? Email { get; set; }
    }
} 