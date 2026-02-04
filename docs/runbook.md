# Virtual Classroom – Operations Runbook

## Overview

This runbook covers common operational tasks for the Virtual Classroom API (backend) and related infrastructure.

---

## Run locally

**Prerequisites:** .NET 10 SDK, Node.js 18+, npm. Optional: Docker (for Postgres/Redis/LiveKit).

### Option A – Minimal (no database; in-memory backend)

1. **Backend (in-memory)**  
   From repo root:
   ```bash
   cd VirtualClassroom.Backend
   dotnet run --launch-profile InMemory
   ```
   API + SignalR: **http://localhost:5275**. No Postgres or Redis required.

2. **Frontend**  
   In another terminal:
   ```bash
   cd live-study-room
   npm install
   ng serve
   ```
   App: **http://localhost:4200**. It already points to `http://localhost:5275` for API and hub.

3. **Video (optional)**  
   To use video calls, run a LiveKit server locally (e.g. [livekit-server](https://docs.livekit.io/home/get-started/) on `ws://localhost:7880`). The frontend dev environment is already set to `ws://localhost:7880`. Without LiveKit, the rest of the app (rooms, chat, Pomodoro) still works.

### Option B – Full stack (Postgres + Redis)

1. **Start Postgres and Redis**  
   From repo root:
   ```bash
   docker compose up -d postgres redis
   ```

2. **Backend (using DB)**  
   Ensure `VirtualClassroom.Backend/appsettings.Development.json` has:
   - `UseInMemory: false`
   - `ConnectionStrings__DefaultConnection`: `Host=localhost;Port=5432;Database=VirtualClassroom;Username=postgres;Password=root` (match `docker-compose.yml` if you use it)
   - `ConnectionStrings__Redis`: `localhost:6379`  
   Then:
   ```bash
   cd VirtualClassroom.Backend
   dotnet run
   ```

3. **Frontend**  
   Same as Option A: `cd live-study-room && npm install && ng serve`.

### Option C – All in Docker

From repo root:
```bash
docker compose up --build
```
Backend + Postgres + Redis at **http://localhost:5275**. Run the frontend locally: `cd live-study-room && npm install && ng serve` (frontend is not in this compose file).

## Prerequisites

- Access to deployment environment (Railway, Kubernetes, or Docker)
- Connection strings and secrets (see [Secrets](#secrets))
- `dotnet` CLI for local operations

---

## Health Checks

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Liveness – process is up (no dependencies) |
| `GET /health/ready` | Readiness – Postgres + Redis are reachable |

**Actions:**

- **Liveness failing:** Restart the pod/process. Check logs for unhandled exceptions.
- **Readiness failing:** Verify Postgres and Redis are running and reachable; check connection strings and network policies.

---

## Logs and Observability

- **Serilog:** Console (default), optional file (`Serilog:WriteTo:File:Path`), optional Seq (`Serilog:Seq:ServerUrl`).
- **OpenTelemetry:** Set `OpenTelemetry:Otlp:Endpoint` to export traces/metrics to Jaeger or similar.
- **Request ID:** Every response includes `X-Request-ID`; use it to correlate logs and traces.

**Actions:**

- **High error rate:** Search logs by `RequestId`; check audit logs for failed paths; review exception middleware logs.
- **Slow requests:** Use trace IDs in your APM/Seq to find slow operations.

---

## Database

- **Provider:** PostgreSQL (Npgsql).
- **Migrations:** Run automatically on startup (`MigrateAsync`). If migration fails, the app still starts (degraded); fix connection and redeploy.

**Actions:**

- **Migration failed:** Check `ConnectionStrings__DefaultConnection`; ensure DB is up and schema is compatible; redeploy.
- **Backup/restore:** Use your Postgres backup strategy (e.g. pg_dump, managed backup). Not handled by the app.

---

## Redis

- **Usage:** Refresh tokens, SignalR backplane, optional Hangfire storage.
- **Connection:** `ConnectionStrings__Redis`.

**Actions:**

- **Redis down:** Refresh tokens and SignalR scale-out will fail; restore Redis and optionally restart API.

---

## Hangfire (Background Jobs)

- **Dashboard:** `GET /hangfire` (when `Hangfire:Enabled` is true and not UseInMemory).
- **Storage:** Redis.

**Actions:**

- **Jobs not running:** Ensure Hangfire is enabled and Redis is configured; check dashboard for failed jobs.
- **Dashboard access:** In Production, only authenticated users (extend `HangfireAuthorizationFilter` as needed).

---

## Feature Flags

- **Provider:** Microsoft.FeatureManagement (config-based). Keys under `FeatureManagement` in appsettings.
- **Usage:** e.g. `IFeatureManager.IsEnabledAsync("FeatureName")`.

**Actions:**

- **Change behavior:** Update config or swap provider (e.g. LaunchDarkly, Azure App Configuration).

---

## Secrets

- **Development:** Use User Secrets (`dotnet user-secrets set "JwtSettings:SecretKey" "..."` in Backend project).
- **Production:** Use environment variables or a secrets manager (e.g. Azure Key Vault, Kubernetes secrets). Never commit secrets.

---

## Deployment

- **Docker:** `docker build -f VirtualClassroom.Backend/Dockerfile .` then run with env vars for connection strings and JWT.
- **Kubernetes:** Apply `k8s/` manifests (namespace, configmap, secrets, deployment, service, ingress, HPA, network-policy).
- **Railway:** Use `railway.toml` and set env vars in dashboard. See [Railway variables](#railway-variables) below.

### Railway variables

Deploy **two services** on Railway: one for the backend (repo root), one for the frontend (`live-study-room`).

**Backend service** (Root Directory = *empty*, Dockerfile = `Dockerfile.backend`):

| Variable | Required | Example / notes |
|----------|----------|------------------|
| `PORT` | Set by Railway | Auto-injected; app listens on this port. |
| `ConnectionStrings__DefaultConnection` | Yes | Postgres: `Host=...;Port=5432;Database=VirtualClassroom;User Id=...;Password=...` (add Railway Postgres or external URL). |
| `ConnectionStrings__Redis` | Yes | Redis URL, e.g. `rediss://default:...@...railway.app:port` (add Railway Redis or external). |
| `JwtSettings__SecretKey` | Yes | Min 32 characters for HS256. |
| `JwtSettings__Issuer` | Optional | Default from appsettings: `VirtualClassroomIssuer`. |
| `JwtSettings__Audience` | Optional | Default: `VirtualClassroomAudience`. |
| `LiveKit__ApiKey` | Yes (for video) | From LiveKit Cloud or self-hosted. |
| `LiveKit__ApiSecret` | Yes (for video) | From LiveKit Cloud or self-hosted. |
| `Cors__Origins__0`, `Cors__Origins__1`, ... | Yes | Your frontend URLs, e.g. `https://your-frontend.railway.app` (add each as `Cors__Origins__0`, `Cors__Origins__1`). |

**Frontend service** (Root Directory = `live-study-room`, Dockerfile = `Dockerfile`):

| Variable | Required | Example / notes |
|----------|----------|------------------|
| `API_URL` | Yes | Backend API base, e.g. `https://your-backend.railway.app/api/v1`. |
| `HUB_URL` | Yes | SignalR hub base, e.g. `https://your-backend.railway.app/hubs/room`. |
| `LIVEKIT_SERVER_URL` | Yes (for video) | LiveKit WebSocket URL, e.g. `wss://your-project.livekit.cloud`. |
| `PORT` | Set by Railway | Auto-injected; nginx listens on this port. |

---

## Incident Response

1. **Check health:** `/health` and `/health/ready`.
2. **Check logs:** Filter by time, RequestId, or trace ID.
3. **Check dependencies:** Postgres, Redis, LiveKit (if used).
4. **Scale:** Increase replicas (HPA) or vertical resources if needed.
5. **Rollback:** Redeploy previous image or revert config; re-run migrations if needed.

---

## Contacts and References

- **Architecture decisions:** See `docs/ADR-001-enterprise-stack.md`.
- **API docs:** Swagger at `/` when enabled (development or `EnableSwagger: true`).
