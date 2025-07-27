namespace VirtualClassroom.Backend.DTOs.Auth
{
    public class AuthResponseDto
    {
        public string? Token { get; set; }
        public string? Username { get; set; }
        public string? Email { get; set; }
        public bool IsPremium { get; set; }
        public string? Role { get; set; }
    }
} 