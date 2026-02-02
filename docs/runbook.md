# Virtual Classroom – Operations Runbook

## Overview

This runbook covers common operational tasks for the Virtual Classroom API (backend) and related infrastructure.

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
- **Railway:** Use `railway.toml` and set env vars in dashboard.

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
