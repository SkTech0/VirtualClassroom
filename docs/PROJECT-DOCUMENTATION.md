# Virtual Classroom – Project Documentation

This document explains **every part** of the Virtual Classroom project: what each component does, how data and requests flow, and how to run or change the system step by step.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Solution Structure](#2-solution-structure)
3. [Request Flow (End-to-End)](#3-request-flow-end-to-end)
4. [Backend: Program.cs (Startup Pipeline)](#4-backend-programcs-startup-pipeline)
5. [Application Layer (CQRS + MediatR)](#5-application-layer-cqrs--mediatr)
6. [Domain Entities](#6-domain-entities)
7. [Infrastructure](#7-infrastructure)
8. [Controllers and SignalR Hub](#8-controllers-and-signalr-hub)
9. [Frontend (Angular)](#9-frontend-angular)
10. [Configuration](#10-configuration)
11. [Docker and Deployment](#11-docker-and-deployment)
12. [CI/CD](#12-cicd)
13. [Testing](#13-testing)
14. [API Reference](#14-api-reference)

---

## 1. Project Overview

**Virtual Classroom** is a real-time study app with:

- **Backend:** .NET 10 Web API + SignalR (C#)
- **Frontend:** Angular 19 (TypeScript)
- **Data:** PostgreSQL (or SQLite in-memory for dev), Redis (tokens + SignalR backplane)
- **Video:** WebRTC via LiveKit

**Main features:**

- **Auth:** Register, login, JWT + refresh tokens
- **Rooms:** Create room (6-character code), join by code, leave
- **Chat:** Real-time chat in each room (SignalR)
- **Pomodoro:** Shared timer in room (start/end, synced via SignalR)
- **Video:** Join/leave video call, mute/unmute, screen share (LiveKit token from API)

The app uses **Clean Architecture**: Domain → Application (CQRS) → Infrastructure → Backend (API host).

---

## 2. Solution Structure

The solution (`VirtualClassroom.sln`) contains six projects:

| Project | Purpose |
|--------|--------|
| **VirtualClassroom.Domain** | Entities only (Room, Session, Pomodoro, VideoSession, LeaderboardEntry). No dependencies. |
| **VirtualClassroom.Application** | CQRS: Commands/Queries, Handlers, Validators (MediatR + FluentValidation). Depends on Domain and interfaces. |
| **VirtualClassroom.Infrastructure** | Implementations: EF Core DbContext, repositories, Identity, JWT/refresh tokens (in-memory or Redis), LiveKit, email (NoOp). Depends on Application + Domain. |
| **VirtualClassroom.Backend** | ASP.NET Core host: Program.cs, Controllers, Hubs, Middleware, DTOs. Depends on Application + Infrastructure. |
| **VirtualClassroom.Tests.Unit** | Unit tests for Application handlers/validators and Infrastructure auth. |
| **VirtualClassroom.Tests.Integration** | Integration tests (e.g. health endpoints) using `WebApplicationFactory`. |

**Frontend** (separate repo folder):

- **live-study-room/** — Angular 19 SPA: auth, rooms, chat, Pomodoro, video-conference, leaderboard.

**Root files:**

- **Dockerfile.backend** — Builds the .NET API (from repo root so the solution is in context).
- **docker-compose.yml** — Runs Postgres, Redis, and the API.
- **railway.toml** — Railway build/deploy config for the backend.
- **.github/workflows/ci.yml** — CI: build, test, optional Docker build.
- **k8s/** — Kubernetes manifests (namespace, deployment, configmap, ingress, HPA, network policy).

---

## 3. Request Flow (End-to-End)

Example: **User creates a room** from the Angular app.

1. **Frontend:** User clicks “Create room”, enters subject. Angular calls `ApiService.post('rooms/create', { subject })`.
2. **HTTP:** Request goes to `POST /api/v1/rooms/create` with `Authorization: Bearer <JWT>`.
3. **Backend pipeline (in order):**  
   - Request ID middleware adds `X-Request-ID`.  
   - Serilog request logging.  
   - HSTS/HTTPS (in Production).  
   - Security headers (CSP, X-Frame-Options, etc.).  
   - Audit middleware (logs who/path/method/status/duration for non-success).  
   - Global exception handler (catches validation and other errors).  
   - Rate limiter → CORS → Routing → Authentication (JWT) → Authorization.  
   - Controller is invoked.
4. **RoomsController.Create:** Reads `UserId` from JWT claims, builds `CreateRoomCommand(UserId, Subject)`, sends it via `IMediator.Send(command)`.
5. **Application:**  
   - `ValidationBehavior` runs first: finds `CreateRoomCommandValidator`, validates the command; if invalid, throws `ValidationException` → middleware returns 400 with error list.  
   - `CreateRoomCommandHandler` runs: uses `IIdentityService`, `IRoomRepository`, `ISessionRepository`; generates a unique 6-char code, creates `Room` and `Session`, saves; returns `RoomResponse`.
6. **Controller:** Returns `Ok(response)` with the new room (id, code, subject, etc.).
7. **Frontend:** Receives the response, stores the room code, navigates to the room page and connects to SignalR group for that room (chat, Pomodoro, etc.).

**SignalR flow (e.g. chat message):**

1. Frontend connects to `/hubs/room` with JWT (query or header).
2. User joins room group: `invoke('JoinRoomGroup', roomCode)`.
3. User sends message: `invoke('SendMessage', roomCode, username, message)`.
4. **RoomHub.SendMessage** broadcasts `ReceiveMessage` to all clients in that group.
5. All clients in the room (including sender) receive the message and update the UI.

---

## 4. Backend: Program.cs (Startup Pipeline)

`VirtualClassroom.Backend/Program.cs` is the entry point. Below is what each section does.

### 4.1 Configuration and port

- **User Secrets:** In Development, `AddUserSecrets<Program>(optional: true)` so secrets are not committed.
- **Port:** Reads `PORT` from environment (e.g. Railway); if set, uses `http://+:{PORT}`, else `http://+:8080`.

### 4.2 Logging (Serilog)

- Reads Serilog config from `appsettings`.
- Enriches logs with context.
- Writes to Console always.
- If `Serilog:File:Path` is set, writes to a rolling file (day, 7 files retained).
- If `Serilog:Seq:ServerUrl` is set, sends logs to Seq.

### 4.3 OpenTelemetry

- If `OpenTelemetry:Otlp:Endpoint` is set, configures:
  - **Tracing:** ASP.NET Core + HttpClient + custom source `"VirtualClassroom"`, OTLP exporter.
  - **Metrics:** ASP.NET Core + HttpClient, OTLP exporter.
- Used for Jaeger or any OTLP-compatible backend.

### 4.4 Resilient HttpClient (Polly)

- Registers a named `HttpClient` `"Resilient"` with:
  - **Retry:** 3 attempts, exponential backoff (2^attempt seconds).
  - **Circuit breaker:** 5 failures → open 30 seconds.
- Any service that injects `IHttpClientFactory` and creates a client named `"Resilient"` gets this behavior.

### 4.5 Application and Infrastructure

- `AddApplication()` — Registers MediatR from the Application assembly, all FluentValidation validators, and `ValidationBehavior<,>` so every MediatR request is validated before the handler runs.
- `AddInfrastructure(config)` — Registers DbContext (SQLite in-memory or PostgreSQL), Identity, repositories, auth token service (in-memory or Redis), LiveKit, `IEmailSender` (NoOp), etc.

### 4.6 Authentication (JWT)

- Default scheme: `JwtBearer`.
- Token validation: Issuer, Audience, Lifetime, SigningKey from `JwtSettings` in config.
- **SignalR:** `OnMessageReceived` checks query string for `access_token` when path starts with `/hubs/room` and sets `context.Token` so SignalR can authenticate the connection.

### 4.7 Authorization policies

- **Teacher:** roles Teacher, Admin.
- **Admin:** role Admin.
- **Student:** roles Student, Teacher, Admin.

### 4.8 CORS

- Policy `"Default"`: origins from `Cors:Origins` (or localhost:4200), any header/method, credentials allowed (for cookies/auth).

### 4.9 Rate limiting

- **Global:** Fixed window 1 minute, 100 requests per IP.
- **Named policy "auth":** 10 requests per minute per IP (for login/register).

### 4.10 HSTS

- Preload, include subdomains, max-age 365 days (used when `UseHsts()` runs in Production).

### 4.11 Controllers and API versioning

- `AddControllers()`.
- API versioning: default v1, assume default when not specified, report versions; URL format `api/v{version}/...`.

### 4.12 SignalR

- Adds SignalR with detailed errors in Development.
- If **not** in-memory mode, uses `AddStackExchangeRedis` with `ConnectionStrings:Redis` as backplane so multiple API instances share SignalR groups.

### 4.13 Hangfire (optional)

- If **not** in-memory and `Hangfire:Enabled` is true: configures Hangfire with Redis storage and adds Hangfire server.
- Used for background jobs; dashboard is mounted later.

### 4.14 Feature management and Swagger

- `AddFeatureManagement()` — Config-based feature flags (e.g. from `FeatureManagement` section).
- `AddSwaggerGen` — Swagger v1 doc, Bearer security definition and requirement.

### 4.15 Health checks

- **Live:** A check that always returns Healthy (tag `"live"`). Used by Kubernetes/Railway to know the process is up.
- **Ready:** If in-memory: DbContext check (tag `"ready"`). If not in-memory: Npgsql + Redis (tag `"ready"`).
- Endpoints: `/health` = live only; `/health/ready` = ready only.

### 4.16 Build and middleware order

- `var app = builder.Build();`
- **Request ID:** Middleware that sets or propagates `X-Request-ID` and pushes it into Serilog context.
- **Serilog request logging.**
- **HSTS + HTTPS redirect** (Production only).
- **Security headers:** X-Content-Type-Options, X-Frame-Options, Referrer-Policy, CSP, Permissions-Policy.
- **AuditLoggingMiddleware:** Logs (userId, path, method, status, duration) for responses with status >= 400.
- **Global exception handler:** Catches exceptions, maps `ValidationException` → 400 with error list, `InvalidOperationException` → 400, `UnauthorizedAccessException` → 401, DB-related → 503, others → 500; writes JSON body.
- **Rate limiter → CORS → Routing → Authentication → Authorization.**
- **Swagger/SwaggerUI** (if Development or `EnableSwagger` is true), at route prefix `""` so Swagger UI is at root.
- **MapControllers(), MapHub<RoomHub>("/hubs/room").**
- **MapHealthChecks("/health", live)** and **MapHealthChecks("/health/ready", ready).**
- **Hangfire dashboard** at `/hangfire` (when enabled), with `HangfireAuthorizationFilter`.

### 4.17 Database and roles at startup

- Creates a scope, gets `ApplicationDbContext`:
  - If in-memory: `EnsureCreatedAsync()`.
  - Else: `MigrateAsync()`.
- Gets `RoleManager<IdentityRole<Guid>>`, ensures roles `Admin`, `Teacher`, `Student` exist.
- On failure, logs warning but does not block startup (so health check can still succeed).

### 4.18 Run and test entry point

- `app.Run();`
- `public partial class Program { }` — Exposes the entry point for integration tests using `WebApplicationFactory<Program>`.

---

## 5. Application Layer (CQRS + MediatR)

### 5.1 DependencyInjection (Application)

- **MediatR:** Registers all handlers from the Application assembly (commands/queries).
- **FluentValidation:** Registers all validators from the same assembly.
- **ValidationBehavior:** Registered as `IPipelineBehavior<,>`. For every `IRequest<T>`, it runs all `IValidator<TRequest>`; if there are validation failures, throws `ValidationException` (then global middleware returns 400); otherwise calls the handler.

### 5.2 Example: Create room

- **CreateRoomCommand** — Request with `HostUserId`, `Subject`.
- **CreateRoomCommandValidator** — Validates non-empty subject, etc.
- **CreateRoomCommandHandler** — Uses `IIdentityService`, `IRoomRepository`, `ISessionRepository`; generates unique 6-char code; creates `Room` and `Session`; returns `RoomResponse` (id, code, subject, host username, etc.).

Other features follow the same pattern: **Auth** (Register, Login, Refresh, Me), **Rooms** (Join, Leave, GetRoom, GetUserRooms, GetParticipants), **Pomodoro** (Start, End, GetBySession), **Video** (GetLiveKitToken).

### 5.3 Interfaces (Application.Common.Interfaces)

Application defines interfaces; Infrastructure implements them:

- **Identity:** `IIdentityService` (validate credentials, get user info, roles).
- **Auth tokens:** `IAuthTokenService` (generate/validate access + refresh tokens).
- **Persistence:** `IRoomRepository`, `ISessionRepository`, `IPomodoroRepository`, `IVideoSessionRepository`, `IRoomParticipantRepository`, `IRoomCloser`.
- **Video:** `ILiveKitService` (e.g. create token for room/participant).
- **Notifications:** `IEmailSender` (NoOp in Infrastructure).

---

## 6. Domain Entities

All in `VirtualClassroom.Domain/Entities` (namespace `VirtualClassroom.Domain.Entities`).

- **Room:** Id, Code (unique 6 chars), Subject, HostUserId, IsActive, CreatedAt. Has many Sessions.
- **Session:** Id, UserId, RoomId, JoinedAt, LeftAt, Status. Represents a user’s membership in a room. Has many Pomodoros.
- **Pomodoro:** Id, SessionId, StartTime, EndTime, IsBreak — one timer segment.
- **VideoSession:** Tracks user in a video call (RoomCode, UserId, Username, ConnectionId, IsVideoEnabled, IsAudioEnabled); used by RoomHub and `IVideoSessionRepository`.
- **LeaderboardEntry:** For future leaderboard (e.g. study time per user).

DbContext in Infrastructure maps these to tables and configures relationships (Room → Sessions, Session → Pomodoros, unique indexes, FKs).

---

## 7. Infrastructure

### 7.1 DependencyInjection (Infrastructure)

- **DbContext:** If `UseInMemory` is true: SQLite file in temp path. Else: PostgreSQL with connection string from config, migrations assembly = Backend.
- **Identity:** ASP.NET Core Identity with `ApplicationUser`, password rules, unique email; stores in same DbContext.
- **Auth tokens:** If in-memory: `InMemoryAuthTokenService` + `IMemoryCache`. Else: Redis connection + `AuthTokenService` (stores refresh tokens in Redis).
- **Repositories:** All repository interfaces from Application are implemented and registered (Room, Session, Pomodoro, VideoSession, RoomParticipant, RoomCloser).
- **IdentityService, LiveKitService, NoOpEmailSender** registered.

### 7.2 Persistence

- **ApplicationDbContext** (in Infrastructure.Persistence) inherits `IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>`, exposes `DbSet<>` for Room, Session, Pomodoro, LeaderboardEntry, VideoSession. Configures indexes and relationships in `OnModelCreating`.
- **Repositories** use this DbContext to implement create/read/update/delete for rooms, sessions, pomodoros, video sessions, and room participants.

### 7.3 Auth

- **IdentityService:** Uses `UserManager<ApplicationUser>` and `SignInManager` to validate credentials and return user info/roles.
- **InMemoryAuthTokenService:** Stores refresh tokens in memory; issues JWT using same secret as backend.
- **AuthTokenService:** Stores refresh tokens in Redis; issues JWT (used when not in-memory).

### 7.4 Video

- **LiveKitService:** Uses LiveKit API key/secret from config to generate a token for a participant (room name, identity, permissions). Called by `GetLiveKitTokenQuery` handler.

---

## 8. Controllers and SignalR Hub

### 8.1 AuthController (api/v1/auth)

- **POST register** — Body: email, username, password. Sends `RegisterCommand`, returns tokens + user info.
- **POST login** — Body: email, password. Sends `LoginCommand`, returns tokens + user info.
- **POST refresh** — Body: refreshToken. Sends `RefreshTokenCommand`, returns new tokens.
- **GET me** — `[Authorize]`. Sends `GetCurrentUserQuery`, returns current user (from JWT claims).

### 8.2 RoomsController (api/v1/rooms)

- **POST create** — Body: subject. Sends `CreateRoomCommand`, returns room + session id.
- **POST join** — Body: code. Sends `JoinRoomCommand`; on success notifies SignalR group `ParticipantsChanged`.
- **POST leave** — Body: roomCode/code. Sends `LeaveRoomCommand`; notifies group `ParticipantsChanged`.
- **GET mine** — Sends `GetUserRoomsQuery`, returns list of rooms the user is in.
- **GET {code}** — Sends `GetRoomByCodeQuery`, returns room details.
- **GET {code}/participants** — Sends `GetRoomParticipantsQuery`, returns participants.
- **POST knock-knock** — Sends SignalR to group: `KnockKnockReceived(targetUserId, fromUserId)`.
- **POST reminder** — Sends SignalR to group: `ReminderReceived(message)`.

### 8.3 PomodoroController (api/v1/pomodoro)

- **POST start** — Body: sessionId, isBreak. Sends `StartPomodoroCommand`, returns pomodoro.
- **POST end** — Body: pomodoroId, endTime. Sends `EndPomodoroCommand`, returns updated pomodoro.
- **GET session/{sessionId}** — Sends `GetPomodorosBySessionQuery`, returns list of pomodoros for that session.

### 8.4 VideoController (api/v1/video)

- **POST livekit-token** — Body: roomCode, canPublish, canSubscribe. Sends `GetLiveKitTokenQuery`, returns `{ token, roomName }`.

### 8.5 RoomHub (/hubs/room)

- **Authorization:** Hub requires `[Authorize]`; JWT can be sent via query `access_token` or header.
- **Groups:** Clients join a group by room code (e.g. `JoinRoomGroup(roomCode)`).
- **Timer:** `StartTimer`, `PauseTimer`, `ResumeTimer`, `ResetTimer` → broadcast to group (TimerStarted, TimerPaused, etc.).
- **Chat:** `SendMessage(roomCode, user, message)` → broadcast `ReceiveMessage` with timestamp.
- **Knock/Reminder:** `SendKnockKnock`, `SendReminder` → broadcast to group.
- **Participants:** `NotifyParticipantChange` → `ParticipantsChanged`.
- **Video:** `JoinVideoCall` / `LeaveVideoCall` — add/remove from group, update `IVideoSessionRepository`, send existing participants to caller and notify group (UserJoinedVideo / UserLeftVideo). `SendVideoOffer`, `SendVideoAnswer`, `SendVideoIceCandidate` for WebRTC signaling. `ToggleVideo`, `ToggleAudio` update repository and broadcast to group.

---

## 9. Frontend (Angular)

### 9.1 Bootstrap (main.ts)

- Polyfills for `global` and `process` (used by simple-peer / dependencies in browser).
- `bootstrapApplication(AppComponent, appConfig)`.

### 9.2 App config (app.config.ts)

- **Router:** `provideRouter(routes)`.
- **HTTP:** `provideHttpClient(withInterceptors([JwtInterceptor, unauthorizedInterceptor]))` — every HTTP request gets the JWT; on 401 the unauthorized interceptor can try refresh or redirect to login.
- **Animations:** `provideAnimations()`.

### 9.3 Environment (environment.ts)

- **apiUrl:** e.g. `http://localhost:5275/api/v1`.
- **hubUrl:** e.g. `http://localhost:5275/hubs/room`.
- **iceServers:** STUN (e.g. Google) for WebRTC; optional TURN override.

### 9.4 Core services

- **ApiService:** Generic `get/post/put/delete` to `apiUrl` + endpoint; `getApiErrorMessage()` for user-facing error text.
- **AuthService:** Login, register, refresh, logout; stores token and refresh token in localStorage; exposes `currentUser$` and `getUserFromStorage()` / `getUserFromToken()`.
- **SignalRService:** `startConnection(hubUrl, options)` builds connection with auto-reconnect; `on(event, callback)`, `off(event)`, `invoke(method, ...args)`, `stopConnection()`.

### 9.5 API endpoints (api-endpoints.ts)

- Central map of paths: auth (login, register, refresh, me), rooms (create, join, leave, mine, byCode, participants), pomodoro (start, end, bySession), video (livekitToken). Used by components so URLs stay in one place.

### 9.6 Features

- **Auth:** Login / Register components; auth guard for protected routes.
- **Landing:** Landing page.
- **Room list:** Create room, join by code, list “my rooms”.
- **Room:** Main room view: chat, Pomodoro, video call; connects to SignalR, joins room group; uses ApiService for REST (rooms, pomodoro, video token).
- **Chat:** Sends/receives messages via SignalR (`SendMessage`, `ReceiveMessage`).
- **Pomodoro:** Start/pause/reset timer; syncs via SignalR (TimerStarted, TimerPaused, etc.).
- **Video conference:** Gets LiveKit token from API, joins SignalR for signaling; uses LiveKit client / WebRTC for media.
- **Leaderboard:** UI only (backend API can be added later).

### 9.7 Guards and interceptors

- **AuthGuard:** Checks if user is logged in (e.g. from AuthService); otherwise redirects to login.
- **JwtInterceptor:** Adds `Authorization: Bearer <token>` to outgoing requests.
- **UnauthorizedInterceptor:** On 401, can call refresh token and retry, or redirect to login.

---

## 10. Configuration

### 10.1 appsettings.json (Backend)

- **ConnectionStrings:** DefaultConnection (PostgreSQL), Redis.
- **Logging / Serilog:** Levels, file path, Seq URL.
- **OpenTelemetry:** Otlp Endpoint (optional).
- **Hangfire:** Enabled true/false.
- **FeatureManagement:** e.g. EnableSwagger, HangfireDashboard.
- **JwtSettings:** Issuer, Audience, SecretKey (must be long and secret in production).
- **LiveKit:** ApiKey, ApiSecret.
- **Cors:** Origins array (e.g. frontend URL).
- **AllowedHosts:** * (or restrict in production).

### 10.2 appsettings.Development.json

- **UseInMemory:** Can override to false to use real Postgres/Redis locally.
- **ConnectionStrings:** Override for local DB/Redis.

### 10.3 Environment variables (production)

- **PORT** — Set by Railway/containers; backend listens on this.
- **ASPNETCORE_ENVIRONMENT** — Production.
- **ConnectionStrings__DefaultConnection** — PostgreSQL connection string.
- **ConnectionStrings__Redis** — Redis connection string.
- **JwtSettings__SecretKey**, **Issuer**, **Audience** — Must match and be secure.
- **Cors__Origins__0** — Frontend origin (e.g. https://your-app.up.railway.app).
- **UseInMemory** — false in production.

---

## 11. Docker and Deployment

### 11.1 Dockerfile.backend (repo root)

- **Build stage:** .NET 10 SDK; copy repo; `dotnet restore VirtualClassroom.sln`; build Backend in Release.
- **Publish stage:** `dotnet publish` Backend.
- **Final stage:** .NET 10 ASP.NET Alpine runtime; copy publish output; expose 8080; non-root user; HEALTHCHECK `GET /health`; ENTRYPOINT runs `VirtualClassroom.Backend.dll`.

### 11.2 docker-compose.yml

- **postgres:** Postgres 16, database `VirtualClassroom`, healthcheck.
- **redis:** Redis 7, healthcheck.
- **api:** Build from `VirtualClassroom.Backend/Dockerfile` (note: compose uses Backend folder Dockerfile; root `Dockerfile.backend` is for Railway). Environment: UseInMemory=false, connection strings to postgres/redis services, port 5275:8080. Depends on postgres and redis healthy.

### 11.3 Railway (railway.toml)

- **Build:** Dockerfile path `Dockerfile.backend`, context = repo root (Root Directory empty).
- **Deploy:** Health check path `/health`, timeout 30, restart on failure (max 3).

Frontend: separate Railway service; root directory `live-study-room`; build with Dockerfile there; set `API_URL` and `HUB_URL` to the backend URL.

### 11.4 Kubernetes (k8s/)

- **namespace.yaml** — Dedicated namespace for the app.
- **api-deployment.yaml** — Deployment for the API (image, env from ConfigMap/Secrets, readiness/liveness probes to /health and /health/ready).
- **configmap.yaml** — Non-sensitive config (CORS, feature flags, etc.).
- **secrets.example.yaml** — Template for DB, Redis, JWT, LiveKit (replace with real secrets).
- **ingress.yaml** — Ingress for external access.
- **hpa.yaml** — Horizontal Pod Autoscaler (e.g. min 2, max 10, CPU/memory).
- **network-policy.yaml** — Restrict ingress/egress (e.g. API only; egress to same namespace, DNS, HTTPS).

---

## 12. CI/CD

### 12.1 .github/workflows/ci.yml

- **Triggers:** Push/PR to master, main, or feature/**.
- **build-and-test:** Checkout → setup .NET 10 → restore → build Release → test with coverage, upload coverage artifact.
- **security-scan:** Restore → `dotnet list package --vulnerable` (OWASP dependency check).
- **docker-build:** Only on push to master/main, after build-and-test. Builds backend Docker image (context root, file Backend Dockerfile in compose; for main branch this can be switched to Dockerfile.backend if desired) with buildx and cache.

No deployment step; deployment is done by Railway or your own pipeline using the built image.

---

## 13. Testing

### 13.1 Unit tests (VirtualClassroom.Tests.Unit)

- **Application:** Handlers and validators for Auth (Register, Login, Refresh), Rooms (Create, Join, Leave, GetRoom), Pomodoro (Start, End), Video (GetLiveKitToken); ValidationBehavior.
- **Infrastructure:** e.g. InMemoryAuthTokenService.
- Run: `dotnet test VirtualClassroom.Tests.Unit/VirtualClassroom.Tests.Unit.csproj`.

### 13.2 Integration tests (VirtualClassroom.Tests.Integration)

- Uses `WebApplicationFactory<Program>` (hence `public partial class Program`).
- In-memory mode; tests e.g. `/health` and `/health/ready`.
- Run: `dotnet test VirtualClassroom.Tests.Integration/...` or `dotnet test VirtualClassroom.sln`.

### 13.3 Manual E2E

- Start backend and frontend; two browsers (or one normal + one incognito); two users; same room. Test: register, login, create/join room, chat, Pomodoro, video (mute, screen share, leave).

---

## 14. API Reference

Base URL: `/api/v1`. SignalR hub: `/hubs/room`.

| Area | Method | Path / action | Description |
|------|--------|----------------|-------------|
| Auth | POST | auth/register | Register (email, username, password) |
| Auth | POST | auth/login | Login (email, password) |
| Auth | POST | auth/refresh | Refresh tokens (refreshToken) |
| Auth | GET | auth/me | Current user (Bearer) |
| Rooms | POST | rooms/create | Create room (subject) |
| Rooms | POST | rooms/join | Join room (code) |
| Rooms | POST | rooms/leave | Leave room (roomCode/code) |
| Rooms | GET | rooms/mine | My rooms |
| Rooms | GET | rooms/{code} | Room by code |
| Rooms | GET | rooms/{code}/participants | Participants |
| Rooms | POST | rooms/knock-knock | Notify user (roomCode, targetUserId) |
| Rooms | POST | rooms/reminder | Reminder (roomCode, message) |
| Pomodoro | POST | pomodoro/start | Start (sessionId, isBreak) |
| Pomodoro | POST | pomodoro/end | End (pomodoroId, endTime) |
| Pomodoro | GET | pomodoro/session/{sessionId} | List by session |
| Video | POST | video/livekit-token | Get LiveKit token (roomCode, canPublish, canSubscribe) |

**SignalR (RoomHub):** JoinRoomGroup, LeaveRoomGroup, SendMessage, StartTimer, PauseTimer, ResumeTimer, ResetTimer, JoinVideoCall, LeaveVideoCall, SendVideoOffer, SendVideoAnswer, SendVideoIceCandidate, ToggleVideo, ToggleAudio, SendKnockKnock, SendReminder, NotifyParticipantChange, UpdateStatus.

---

## Quick reference: key files

| What | Where |
|------|--------|
| Backend entry point | VirtualClassroom.Backend/Program.cs |
| Application DI (MediatR + validation) | VirtualClassroom.Application/DependencyInjection.cs |
| Infrastructure DI (DB, Identity, Redis, repos) | VirtualClassroom.Infrastructure/DependencyInjection.cs |
| Domain entities | VirtualClassroom.Domain/Entities/*.cs |
| API controllers | VirtualClassroom.Backend/Controllers/Api/V1/*.cs |
| SignalR hub | VirtualClassroom.Backend/Hubs/RoomHub.cs |
| Audit middleware | VirtualClassroom.Backend/Middleware/AuditLoggingMiddleware.cs |
| Frontend bootstrap | live-study-room/src/main.ts |
| Frontend app config | live-study-room/src/app/app.config.ts |
| Frontend API base + hub | live-study-room/src/environments/environment.ts |
| Backend config | VirtualClassroom.Backend/appsettings.json |
| Docker (root) | Dockerfile.backend, docker-compose.yml |
| CI | .github/workflows/ci.yml |
| Operations | docs/runbook.md, docs/ADR-001-enterprise-stack.md |

This document, together with the [README](../README.md), [runbook](runbook.md), and [ADR](ADR-001-enterprise-stack.md), should give you a complete picture of how every step of the Virtual Classroom project works.
