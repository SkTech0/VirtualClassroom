using Microsoft.EntityFrameworkCore;
using VirtualClassroom.Application.Common.Interfaces;
using VirtualClassroom.Domain.Entities;
using VirtualClassroom.Infrastructure.Persistence;

namespace VirtualClassroom.Infrastructure.Persistence.Repositories;

public sealed class PomodoroRepository(ApplicationDbContext db) : IPomodoroRepository
{
    public async Task<Pomodoro> CreateAsync(Pomodoro pomodoro, CancellationToken ct = default)
    {
        db.Pomodoros.Add(pomodoro);
        await db.SaveChangesAsync(ct);
        return pomodoro;
    }

    public async Task<Pomodoro?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await db.Pomodoros.FirstOrDefaultAsync(p => p.Id == id, ct);
    }

    public async Task UpdateAsync(Pomodoro pomodoro, CancellationToken ct = default)
    {
        db.Pomodoros.Update(pomodoro);
        await db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<Pomodoro>> GetBySessionAsync(Guid sessionId, CancellationToken ct = default)
    {
        return await db.Pomodoros
            .Where(p => p.SessionId == sessionId)
            .OrderBy(p => p.StartTime)
            .ToListAsync(ct);
    }
}
