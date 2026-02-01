namespace VirtualClassroom.Application.Common.Interfaces;

public interface IRoomCloser
{
    Task CloseRoomAsync(string roomCode, CancellationToken ct = default);
}
