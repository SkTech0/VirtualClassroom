# VirtualClassroom.Tests.Unit

Unit tests for the VirtualClassroom backend, structured for **high scalability** and **fast CI**:

- **Isolated**: All handlers use mocks (Moq); no database or Redis.
- **Fast**: No I/O; typically completes in under 1 second for the full suite.
- **Deterministic**: No shared state; tests can run in parallel (xUnit default).

## Running tests

```bash
# From repo root
dotnet test VirtualClassroom.Tests.Unit/VirtualClassroom.Tests.Unit.csproj

# With coverage (requires coverlet)
dotnet test VirtualClassroom.Tests.Unit/VirtualClassroom.Tests.Unit.csproj --collect:"XPlat Code Coverage"
```

## Structure

| Area | What's tested |
|------|----------------|
| **Application/Common** | `ValidationBehavior` (pipeline) |
| **Application/Auth** | `LoginCommandHandler`, `RegisterCommandHandler`, `RefreshTokenCommandHandler`; validators for Login, Register |
| **Application/Rooms** | `CreateRoomCommandHandler`, `JoinRoomCommandHandler`, `LeaveRoomCommandHandler`, `GetRoomByCodeQueryHandler`; validators for CreateRoom, JoinRoom |
| **Application/Pomodoro** | `StartPomodoroCommandHandler`, `EndPomodoroCommandHandler` |
| **Application/Video** | `GetLiveKitTokenQueryHandler` |
| **Infrastructure/Auth** | `InMemoryAuthTokenService` (GenerateTokens, RefreshToken, Revoke, RevokeAllUserTokens) |

## Conventions

- **Naming**: `Method_Scenario_ExpectedResult` (e.g. `Handle_InvalidCredentials_ThrowsUnauthorizedAccessException`).
- **Arrange–Act–Assert**: One logical assertion per test where practical.
- **Mocks**: Only external dependencies (IIdentityService, IAuthTokenService, repositories, ILiveKitService) are mocked; domain types are real.
