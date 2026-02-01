using VirtualClassroom.Domain.Entities;

namespace VirtualClassroom.Application.Common.Interfaces;

public interface IPomodoroRepository
{
    Task<Domain.Entities.Pomodoro> CreateAsync(Domain.Entities.Pomodoro pomodoro, CancellationToken ct = default);
    Task<Domain.Entities.Pomodoro?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task UpdateAsync(Domain.Entities.Pomodoro pomodoro, CancellationToken ct = default);
    Task<IReadOnlyList<Domain.Entities.Pomodoro>> GetBySessionAsync(Guid sessionId, CancellationToken ct = default);
}
