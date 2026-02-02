# ADR-001: Enterprise Stack Additions

## Status

Accepted (2025-02-02).

## Context

The Virtual Classroom application needed to align with enterprise expectations for observability, resilience, security, and operations without a full rewrite. We identified 13 areas commonly present in enterprise applications that were missing or minimal.

## Decision

We adopt the following additions, implemented on branch `feature/enterprise-stack`:

1. **CI/CD & quality gates**  
   GitHub Actions workflow: build, test, optional dependency vulnerability check, and (on push to main) Docker build. No deployment step; that remains environment-specific.

2. **Resilience (Polly)**  
   A named `HttpClient` ("Resilient") with retry (3 attempts, exponential backoff) and circuit breaker (5 failures, 30s open). Use this client for outbound HTTP calls that should tolerate transient failures.

3. **Secrets & configuration**  
   User Secrets in Development (optional). Production continues to use environment variables or external config; we document preference for a secrets manager (e.g. Azure Key Vault) where available.

4. **Background jobs (Hangfire)**  
   Hangfire with Redis storage when `Hangfire:Enabled` is true and not UseInMemory. Dashboard at `/hangfire` with authorization (development or authenticated users). Enables scheduled and fire-and-forget jobs without introducing a message queue yet.

5. **Observability**  
   - **Serilog:** Console + optional file sink (`Serilog:WriteTo:File:Path`) + optional Seq (`Serilog:Seq:ServerUrl`).  
   - **OpenTelemetry:** Optional OTLP exporter (`OpenTelemetry:Otlp:Endpoint`) for traces and metrics to Jaeger or similar.  
   No change to existing Serilog/OpenTelemetry instrumentation.

6. **Integration tests**  
   New project `VirtualClassroom.Tests.Integration` using `WebApplicationFactory<Program>`, in-memory mode, and health-endpoint tests. Entry point exposed via `public partial class Program`.

7. **Security & compliance**  
   - **Audit logging:** Middleware that logs (who, path, method, status, duration) for non-success responses, with correlation via RequestId.  
   - **Headers:** CSP, Permissions-Policy, and existing X-Content-Type-Options, X-Frame-Options, Referrer-Policy.

8. **Feature flags**  
   Microsoft.FeatureManagement with configuration-based provider. Can be replaced later with LaunchDarkly or Azure App Configuration.

9. **Notifications**  
   `IEmailSender` abstraction in Application; default implementation `NoOpEmailSender` in Infrastructure. Enables future SendGrid/SMTP without call-site changes.

10. **Kubernetes**  
    - **HPA:** `k8s/hpa.yaml` – min 2, max 10 replicas, CPU/memory targets.  
    - **NetworkPolicy:** `k8s/network-policy.yaml` – restrict ingress to API and egress to same-namespace + DNS/HTTPS.

11. **Documentation**  
    - **Runbook:** `docs/runbook.md` – health, logs, DB, Redis, Hangfire, feature flags, secrets, deployment, incident response.  
    - **ADR:** This document.

12. **Data & backup**  
    No application-level backup logic. Backup and point-in-time recovery remain the responsibility of the database and platform (documented in runbook).

13. **API gateway / service mesh**  
    No API gateway or mesh in this change. Ingress and rate limiting remain as today; gateway/mesh can be added later if we split services or need central auth/throttling.

## Consequences

- **Positive:** Single branch delivers CI, resilience, observability, security, feature flags, background jobs, integration tests, and K8s improvements with minimal breaking change.
- **Negative:** Hangfire and optional Seq/OTLP add configuration surface; we keep defaults safe (Hangfire off, Seq/OTLP empty).
- **Risks:** Network policy and HPA defaults may need tuning per cluster; runbook and ADR assume operators will adapt them.

## References

- Serilog: https://serilog.net  
- Polly: https://github.com/App-vNext/Polly  
- Hangfire: https://www.hangfire.io  
- Microsoft.FeatureManagement: https://github.com/microsoft/FeatureManagement-Dotnet  
- Runbook: `docs/runbook.md`
