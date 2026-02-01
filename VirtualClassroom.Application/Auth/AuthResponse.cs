namespace VirtualClassroom.Application.Auth;

public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    int ExpiresIn,
    DateTime ExpiresAt,
    string Username,
    string Email,
    string Role);
