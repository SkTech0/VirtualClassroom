namespace VirtualClassroom.Application.Rooms;

public record RoomResponse(
    Guid Id,
    string Code,
    string? Subject,
    string HostUsername,
    bool IsActive,
    DateTime CreatedAt,
    Guid? SessionId = null);
