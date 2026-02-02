# VirtualClassroom

A real-time virtual classroom app: Angular frontend and .NET backend with live study rooms, Pomodoro timer, chat, and video calls.

---

## Features

- **Live study rooms** — Create or join rooms with a 6-character code
- **Real-time chat** — SignalR-based chat in each room
- **Pomodoro timer** — Shared timer in room (synced via SignalR)
- **Video calls** — WebRTC with LiveKit (camera, mic, screen share)
- **Auth** — JWT login/register and refresh tokens
- **Leaderboard** — UI (backend API planned)

---

## Prerequisites

- **.NET 10** SDK  
- **Node.js 18+** and npm  
- **Angular CLI 19** — `npm install -g @angular/cli@19`  
- **PostgreSQL** and **Redis** (optional for local dev; backend can use in-memory)

---

## Run locally

### 1. Backend

From repo root:

```bash
cd VirtualClassroom.Backend
dotnet restore
dotnet run
```

- API + SignalR: **http://localhost:5275**
- Swagger: http://localhost:5275 (when running)
- Health: http://localhost:5275/health

**Development:** Uses in-memory storage by default. To use PostgreSQL/Redis, set `UseInMemory: false` in `appsettings.Development.json` and configure connection strings. If port 5275 is in use, use `dotnet run --launch-profile httpAlt` (port 5276) and point the frontend to that port.

### 2. Frontend

In a second terminal:

```bash
cd live-study-room
npm install
ng serve
```

- App: **http://localhost:4200**
- Backend URL is in `src/environments/environment.ts` (`apiUrl`, `hubUrl`). Change them if the backend runs on another port.

### 3. Try it

1. Open http://localhost:4200
2. Sign up or sign in
3. Create a room (e.g. subject "Math") or join with a 6-character code
4. In the room: use Chat, Pomodoro, and Video Call (allow camera/mic when prompted)
5. For two users: open a second incognito window, sign up another user, join the same room with the code

### 4. Optional: Docker Compose (backend + Postgres + Redis)

From repo root:

```bash
docker compose up --build
```

Backend will be at http://localhost:5275. Then run the frontend with `ng serve` in `live-study-room` as above.

---

## Enterprise stack (branch `feature/enterprise-stack`)

The branch `feature/enterprise-stack` adds 13 enterprise-oriented improvements:

- **CI/CD** — GitHub Actions: build, test, dependency check, Docker build on main
- **Resilience** — Polly retry + circuit breaker for a named `HttpClient` ("Resilient")
- **Secrets** — User Secrets in Development; production via env or Key Vault (see runbook)
- **Background jobs** — Hangfire with Redis (opt-in via `Hangfire:Enabled`)
- **Observability** — Serilog file + optional Seq; OpenTelemetry OTLP (Jaeger, etc.)
- **Integration tests** — `VirtualClassroom.Tests.Integration` with `WebApplicationFactory`
- **Security** — Audit middleware (who/what/when), CSP and Permissions-Policy headers
- **Feature flags** — Microsoft.FeatureManagement (config-based)
- **Notifications** — `IEmailSender` abstraction (default: NoOp; swap for SendGrid/SMTP)
- **Kubernetes** — HPA (`k8s/hpa.yaml`) and NetworkPolicy (`k8s/network-policy.yaml`)
- **Documentation** — Runbook (`docs/runbook.md`) and ADR (`docs/ADR-001-enterprise-stack.md`)

See `docs/runbook.md` for operations and `docs/ADR-001-enterprise-stack.md` for decisions.

---

## Testing

### Unit and integration tests (backend)

From repo root:

```bash
dotnet test VirtualClassroom.Tests.Unit/VirtualClassroom.Tests.Unit.csproj
```

Covers Auth, Rooms, Pomodoro, Video handlers and validators, `ValidationBehavior`, and `InMemoryAuthTokenService`. Integration tests (health endpoints) live in `VirtualClassroom.Tests.Integration`. Run all tests:

```bash
dotnet test VirtualClassroom.sln
```

With coverage:

```bash
dotnet test VirtualClassroom.sln --collect:"XPlat Code Coverage"
```

### Manual E2E

1. Start backend and frontend as in **Run locally**
2. Use two browsers (or one normal + one incognito), two users, same room
3. Verify: sign up, create/join room, chat, Pomodoro, video (mute/unmute, screen share, leave)

---

## API (v1)

Base path: `/api/v1`. SignalR hub: `/hubs/room`.

| Area        | Method | Path / action |
|------------|--------|----------------|
| Auth       | POST   | `auth/register`, `auth/login`, `auth/refresh` |
| Auth       | GET    | `auth/me` |
| Rooms      | POST   | `rooms/create`, `rooms/join`, `rooms/leave` |
| Rooms      | GET    | `rooms/mine`, `rooms/{code}`, `rooms/{code}/participants` |
| Rooms      | POST   | `rooms/knock-knock`, `rooms/reminder` |
| Pomodoro   | POST   | `pomodoro/start`, `pomodoro/end` |
| Pomodoro   | GET    | `pomodoro/session/{sessionId}` |
| Video      | POST   | `video/livekit-token` |

---

## Deploy to production

### Option A: Railway

**Backend**

1. New project → add service → connect repo
2. **Root directory:** leave **empty** (build must see repo root and `VirtualClassroom.sln`)
3. **Build:** Dockerfile path = `Dockerfile.backend` (uses `railway.toml` at root)
4. **Variables:**  
   `ASPNETCORE_ENVIRONMENT=Production`  
   `PORT` (set by Railway)  
   `ConnectionStrings__DefaultConnection` = Npgsql format: `Host=...;Port=5432;Database=...;Username=...;Password=...`  
   `ConnectionStrings__Redis` = e.g. `host:port` or `host:port,password=...`  
   `JwtSettings__SecretKey` = long random secret (64+ chars)  
   `JwtSettings__Issuer` = `VirtualClassroomIssuer`  
   `JwtSettings__Audience` = `VirtualClassroomAudience`  
   `Cors__Origins__0` = frontend URL (e.g. `https://your-app.up.railway.app`)  
   `UseInMemory` = `false`
5. Add **PostgreSQL** (and optionally **Redis**) from Railway; set connection strings from their variables
6. Deploy; note backend URL

**Frontend**

1. Add a second service; **Root directory:** `live-study-room`
2. Build: use `live-study-room/Dockerfile`
3. **Build variables:**  
   `API_URL` = `https://YOUR-BACKEND.up.railway.app/api/v1`  
   `HUB_URL` = `https://YOUR-BACKEND.up.railway.app/hubs/room`
4. Deploy

**After deploy:** Open frontend URL; backend health: `https://YOUR-BACKEND.up.railway.app/health`. If auth returns 500/503, check DB and that migrations ran (e.g. run `dotnet ef database update` once with production connection string).

### Option B: Docker (self-hosted)

- **Backend image:** From repo root, `docker build -f Dockerfile.backend -t virtualclassroom-api .`  
  Run with env vars for `ConnectionStrings`, `JwtSettings`, `Cors__Origins__0`, etc.
- **Frontend image:** From `live-study-room`, build with `API_URL` and `HUB_URL`; serve with nginx. See `live-study-room/Dockerfile` and `scripts/set-env-prod.js`.

### Option C: Kubernetes

Manifests in `k8s/`: namespace, deployment, configmap, ingress, and `secrets.example.yaml`. Replace placeholders in ConfigMap and Secrets (CORS origins, DB, JWT, LiveKit); apply with `kubectl apply -f k8s/`.

---

## Project structure

```
VirtualClassroom/
├── live-study-room/           # Angular 19 frontend
├── VirtualClassroom.Backend/  # .NET 10 API + SignalR
├── VirtualClassroom.Application/   # CQRS handlers, validators
├── VirtualClassroom.Domain/        # Entities
├── VirtualClassroom.Infrastructure/ # EF, Redis, LiveKit, auth
├── VirtualClassroom.Tests.Unit/    # Backend unit tests
├── Dockerfile.backend
├── docker-compose.yml
├── docker-compose.prod.yml
├── railway.toml
└── k8s/                       # Kubernetes manifests
```

---

## Tech stack

| Layer     | Stack |
|----------|--------|
| Backend  | .NET 10, EF Core, SignalR, JWT, MediatR, FluentValidation, Serilog, OpenTelemetry |
| Frontend | Angular 19, TypeScript, Angular Material, SignalR client |
| Data     | PostgreSQL (or in-memory for dev), Redis (SignalR backplane in prod) |
| Video    | WebRTC, LiveKit |

---

## Contributing

1. Fork the repo  
2. Create a branch (`git checkout -b feature/your-feature`)  
3. Commit and push  
4. Open a Pull Request  

---

## License

MIT — see the LICENSE file.
