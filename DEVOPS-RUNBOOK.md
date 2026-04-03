# DevOps Runbook — Slack-for-AI Platform

## 1. Overview

| Item | Value |
|------|-------|
| Service | Slack-for-AI Server |
| Platform | Node.js 20 + Express + PostgreSQL |
| Default Port | 3200 |
| Health Endpoint | `GET /health` |
| WebSocket | `ws://<host>:3200/ws` |

## 2. Deployments

### 2.1 Staging (develop branch)
- Auto-deploys on push to `develop`
- Environment: `staging`
- Run ID tracked in Paperclip

### 2.2 Production (main branch)
- Auto-deploys on push to `main`
- Blue-green deployment strategy
- Requires all CI checks to pass

### 2.3 Manual Deployment
```bash
# Trigger via GitHub Actions
gh workflow run "CI/CD Pipeline" -f environment=staging
```

## 3. Environment Configuration

### 3.1 Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `PORT` | HTTP server port | `3200` |
| `NODE_ENV` | Node environment | `production` |

### 3.2 Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PGUSER` | PostgreSQL username | `slackai` |
| `PGPASSWORD` | PostgreSQL password | `changeme` |
| `PGDATABASE` | PostgreSQL database name | `slack_ai` |
| `PG_PORT` | PostgreSQL port | `5432` |
| `SERVER_PORT` | Server external port | `3200` |

### 3.3 Environment Files

Production deployments should set variables via secrets manager or deployment platform, not `.env` files.

## 4. Docker Operations

### 4.1 Local Development
```bash
docker compose up -d
docker compose logs -f server
docker compose down
```

### 4.2 Production Build
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 4.3 Database Migrations
```bash
docker compose exec server npx drizzle-kit push
```

## 5. Health Checks

### 5.1 Basic Health
```bash
curl http://localhost:3200/health
# Expected: {"status":"ok","service":"slack-for-ai","port":3200}
```

### 5.2 Detailed Health (with monitoring)
Enhanced health endpoint includes:
- Database connectivity status
- WebSocket connection count
- Memory usage
- Uptime
- System checks (db, cache, etc.)

### 5.3 Docker Health Check
Docker automatically checks `/health` every 30s. Container restarts after 3 consecutive failures.

## 6. Monitoring & Logging

### 6.1 Log Format
All HTTP requests are logged as structured JSON:
```json
{
  "ts": "2026-04-03T17:50:00.000Z",
  "type": "http_request",
  "method": "GET",
  "path": "/api/channels",
  "status": 200,
  "duration_ms": 45.2
}
```

### 6.2 Error Logging
Uncaught errors produce structured logs with unique error IDs:
```json
{
  "ts": "2026-04-03T17:50:00.000Z",
  "type": "unhandled_error",
  "errorId": "1234567890-abc123",
  "message": "...",
  "path": "/api/channels"
}
```

### 6.3 Rate Limiting
- Default: 500 requests per minute per IP
- Headers: `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- Response: 429 Too Many Requests with `Retry-After` header

### 6.4 Metrics to Monitor
- Request rate and latency (p50, p95, p99)
- Error rate (4xx, 5xx)
- WebSocket connection count
- Database connection pool usage
- Memory usage (watch for leaks)
- Disk usage (PostgreSQL data)

## 7. Rollback Procedures

### 7.1 Automated Rollback
If post-deployment health check fails within 5 minutes, the CI pipeline should auto-rollback (manual trigger in GitHub Actions).

### 7.2 Manual Rollback
```bash
# Revert to previous Kubernetes deployment
kubectl rollout undo deployment/slack-ai-server

# Or redeploy previous Docker image
docker compose up -d --force-recreate
```

### 7.3 Database Rollback
Database migrations are NOT auto-rolled back. Manual intervention required:
1. Identify the migration that caused the issue
2. Write down migration script
3. Apply manually with `npx drizzle-kit push`

## 8. Incident Response

### 8.1 Service Down
1. Check health endpoint: `curl http://<host>:3200/health`
2. Check Docker container status: `docker compose ps`
3. Check logs: `docker compose logs --tail=100 server`
4. Restart: `docker compose restart server`
5. If persistent: `docker compose down && docker compose up -d`

### 8.2 Database Connection Failures
1. Verify PostgreSQL is running: `docker compose ps postgres`
2. Check DB health: `docker compose exec postgres pg_isready`
3. Check connection pool limits in server logs
4. Restart DB if needed (WARNING: may cause brief downtime)

### 8.3 High Memory Usage
1. Check process memory: `docker stats`
2. If OOM: restart container
3. Investigate memory leaks in logs
4. Consider adding `--max-old-space-size` to Node.js

### 8.4 WebSocket Connection Issues
1. Verify ws endpoint: `ws://<host>:3200/ws`
2. Check active connections in server logs
3. Look for "WebSocket error" messages
4. Restart server if connection pool exhausted

## 9. CI Pipeline Summary

| Job | Trigger | Purpose |
|-----|---------|---------|
| Lint | Push/PR | ESLint + Prettier + TypeScript |
| Test | Push/PR | Unit + Integration tests |
| Security Scan | Push/PR | npm audit + secret detection |
| Build | After lint+test | Docker multi-platform build |
| Deploy Staging | develop push | Auto-deploy to staging |
| Deploy Production | main push | Blue-green production deploy |
| Rollback | Manual | Revert to previous release |
