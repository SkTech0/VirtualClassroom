# VirtualClassroom Enterprise Migration

## Summary

The VirtualClassroom project has been refactored into an enterprise-grade, cloud-deployable system. This document describes the architectural changes, new components, and deployment instructions.

## Enterprise Readiness Checklist

| Area | Feature | Status |
|------|---------|--------|
| **Backend** | Clean Architecture + CQRS (MediatR) | Done |
| | JWT + refresh tokens (Redis) | Done |
| | FluentValidation + global exception handling (400/500) | Done |
| | Security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy) | Done |
| | HSTS + HTTPS redirect (Production only) | Done |
| | Request ID correlation (X-Request-ID) | Done |
| | Swagger only in non-Production (or EnableSwagger) | Done |
| | Rate limiting (global + auth) | Done |
| | Health checks (PostgreSQL, Redis) | Done |
| | OpenTelemetry + Serilog | Done |
| **Docker** | Multi-stage build, non-root user, HEALTHCHECK | Done |
| **K8s** | Deployment, Service, ConfigMap, Secrets template, Ingress | Done |
| **Frontend** | Environment-based API/hub URLs (dev vs prod) | Done |
| **Config** | appsettings.Production.json, Cors/AllowedHosts | Done |

## Backend Architecture

### Clean Architecture + Vertical Slices

```
VirtualClassroom.sln
├── VirtualClassroom.Domain        # Entities, value objects
├── VirtualClassroom.Application   # CQRS (MediatR), use cases, interfaces
├── VirtualClassroom.Infrastructure # EF Core, Identity, Redis, LiveKit
└── VirtualClassroom.Backend       # API (controllers, SignalR hub)
```

### Key Features Implemented

| Feature | Implementation |
|---------|----------------|
| **CQRS + MediatR** | All business logic in command/query handlers |
| **OAuth2/OIDC** | JWT access tokens (15min) + refresh tokens (7 days) stored in Redis with revocation support |
| **RBAC** | Admin, Teacher, Student roles (ASP.NET Identity) |
| **SignalR** | Redis backplane for horizontal scaling |
| **LiveKit** | Token endpoint for WebRTC SFU (`POST /api/v1/video/livekit-token`) |
| **Rate Limiting** | Built-in .NET rate limiter (100 req/min global, 10 req/min auth) |
| **API Versioning** | URL-based v1 (`/api/v1/...`) |
| **OpenTelemetry** | Tracing + metrics instrumentation |
| **Structured Logging** | Serilog with console sink |
| **Health Checks** | PostgreSQL, Redis at `/health` |

### API Endpoints (v1)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/auth/register | Register user |
| POST | /api/v1/auth/login | Login (returns accessToken, refreshToken) |
| POST | /api/v1/auth/refresh | Refresh access token |
| GET | /api/v1/auth/me | Current user (requires auth) |
| POST | /api/v1/rooms/create | Create room |
| POST | /api/v1/rooms/join | Join room |
| POST | /api/v1/rooms/leave | Leave room |
| GET | /api/v1/rooms/mine | List current user's rooms (active sessions) |
| GET | /api/v1/rooms/{code} | Get room by code |
| GET | /api/v1/rooms/{code}/participants | Get participants |
| POST | /api/v1/pomodoro/start | Start Pomodoro |
| POST | /api/v1/pomodoro/end | End Pomodoro |
| POST | /api/v1/video/livekit-token | Get LiveKit access token for room |

### Configuration (appsettings.json)

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=VirtualClassroom;Username=postgres;Password=root",
    "Redis": "localhost:6379"
  },
  "JwtSettings": { "Issuer", "Audience", "SecretKey" },
  "LiveKit": { "ApiKey", "ApiSecret" },
  "Cors": { "Origins": ["http://localhost:4200"] }
}
```

## Infrastructure

### Docker Compose (Local Development)

```bash
# Start PostgreSQL + Redis + API
docker-compose up -d

# API available at http://localhost:5275
# Run migrations first:
dotnet ef database update --project VirtualClassroom.Backend --startup-project VirtualClassroom.Backend
```

### Kubernetes

Manifests in `k8s/`:
- `namespace.yaml` - virtualclassroom namespace
- `configmap.yaml` - non-sensitive config
- `api-deployment.yaml` - API deployment + service

**Required**: Create Secret `virtualclassroom-secrets` with `postgres-connection-string`, `JwtSettings__SecretKey`, `LiveKit__ApiSecret`.

## Frontend Updates

- Auth API base URL updated to `http://localhost:5275/api/v1`
- Auth response now includes `accessToken`, `refreshToken`, `role`
- API service base URL updated for v1 endpoints

### Remaining Frontend Work (Per Target Stack)

1. **Angular 19** - Upgrade from 17, enable zoneless, signals-first
2. **NgRx Signals Store** - Replace BehaviorSubject in auth/room state
3. **Angular SSR + Hydration** - Add @angular/ssr
4. **PWA** - Add service worker
5. **Sentry** - Error tracking
6. **Feature Flags** - Integrate LaunchDarkly or similar
7. **Bootstrap Removal** - Angular Material only
8. **LiveKit Client** - Replace simple-peer with @livekit/components-angular for video

## Running the System

### Option A: Production-like (PostgreSQL + Redis via Docker) — Default

```powershell
cd c:\Backend\VirtualClassroom

# Terminal 1 - Start Postgres and Redis
docker compose up -d postgres redis

# Terminal 2 - Backend (migrations run automatically on startup)
dotnet run --project VirtualClassroom.Backend

# Terminal 3 - Frontend
cd live-study-room
npm install
ng serve
```

- Backend: http://localhost:5275
- Swagger: http://localhost:5275
- Frontend: http://localhost:4200
- PostgreSQL: localhost:5432 (user: postgres, password: root)
- Redis: localhost:6379

### Option B: Full stack in Docker

```powershell
docker compose up --build
```

API at http://localhost:5275 (port 5275 mapped).

### Option C: In-memory (no Docker)

Use the **InMemory** launch profile for quick local dev without PostgreSQL/Redis:

```powershell
dotnet run --project VirtualClassroom.Backend --launch-profile InMemory
```

Or set `UseInMemory: true` in `appsettings.Development.json`.

## Deployment Runbook

### Prerequisites

- .NET 10 SDK, Docker (optional), Kubernetes cluster (optional)
- PostgreSQL 16, Redis 7 (or use Docker Compose)
- For production: set `JwtSettings:SecretKey` (min 32 chars), `Cors:Origins`, `ConnectionStrings`, `LiveKit` from secrets/env

### 1. Local (Development)

```powershell
# Option A: PostgreSQL + Redis via Docker
docker compose up -d postgres redis
dotnet run --project VirtualClassroom.Backend

# Option B: In-memory (no Docker)
dotnet run --project VirtualClassroom.Backend --launch-profile InMemory
```

### 2. Docker (Production-like)

```powershell
# Build and run API + Postgres + Redis
docker compose up -d --build

# Production mode (no Swagger, ASPNETCORE_ENVIRONMENT=Production)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### 3. Kubernetes

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Create secrets (use k8s/secrets.example.yaml as template; do not commit real secrets)
kubectl create secret generic virtualclassroom-secrets \
  --from-literal=postgres-connection-string="Host=...;Password=..." \
  --from-literal=JwtSettings__SecretKey="YOUR_MIN_32_CHAR_SECRET" \
  --from-literal=LiveKit__ApiSecret="YOUR_LIVEKIT_SECRET" \
  -n virtualclassroom

# ConfigMap (edit Cors, Redis, LiveKit__ApiKey as needed)
kubectl apply -f k8s/configmap.yaml

# Deploy API (build and push image first: virtualclassroom-api:latest)
kubectl apply -f k8s/api-deployment.yaml

# Optional: Ingress (adjust host and TLS)
kubectl apply -f k8s/ingress.yaml
```

### 4. Frontend (Production build)

- **Development**: `ng serve` uses `environment.ts` (apiUrl: http://localhost:5275/api/v1, hubUrl: http://localhost:5275/hubs/room).
- **Production**: `ng build` uses `environment.prod.ts` (apiUrl: /api/v1, hubUrl: /hubs/room). Deploy `dist/live-study-room` behind the same origin or a reverse proxy that forwards `/api` and `/hubs` to the API.

---

## Migration Notes

- Old controllers (AuthController, RoomController, PomodoroController) replaced by Api/V1 versions
- Old Services, DTOs, Models, Data folders excluded from build (legacy code retained for reference)
- Migrations updated to reference `VirtualClassroom.Infrastructure.Persistence.ApplicationDbContext`
- EF migrations must be run from VirtualClassroom.Backend project (DesignTimeDbContextFactory points to Infrastructure)
