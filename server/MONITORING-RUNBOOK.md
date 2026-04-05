# Monitoring, Logging & Health - Runbook (A-26 Deliverables)

## Overview

This document covers the monitoring, logging, and health check infrastructure for the Slack-for-AI platform.

## Deliverables

### 1. Health Check Endpoints

Three endpoints are available at `/api/health`:

| Endpoint | Purpose | HTTP Method | Response Codes |
|----------|---------|-------------|----------------|
| `/api/health/live` | Kubernetes liveness probe - is the process running? | GET | 200 always |
| `/api/health/ready` | Kubernetes readiness probe - can we handle requests? | GET | 200 (ready), 503 (not ready) |
| `/api/health` | Full health check with all details | GET | 200 (ok/degraded), 503 (unhealthy) |

#### Health Response Format

```json
{
  "status": "ok",
  "service": "slack-for-ai",
  "version": "1.0.0",
  "timestamp": "2026-04-03T20:30:00.000Z",
  "uptime_seconds": 3600,
  "correlation_id": "abc123xyz789",
  "checks": {
    "database": {
      "status": "ok",
      "details": {
        "connection_time_ms": 5,
        "pool_total": 5,
        "pool_idle": 4,
        "pool_waiting": 0
      }
    }
  },
  "environment": "development"
}
```

### 2. Correlation ID Middleware

- **Header**: `x-correlation-id`
- **Format**: 12-character alphanumeric string
- **Behavior**: Reads existing ID from request headers, generates new one if missing
- **Propagation**: Attached to all responses and log entries
- **File**: `src/middleware/correlation.ts`

### 3. Structured Logging

- **Format**: JSON lines to stdout/stderr
- **Levels**: debug, info, warn, error
- **File**: `src/utils/logger.ts`
- **Methods**:
  - `logger.info("message", meta?)` - General info
  - `logger.warn("message", meta?)` - Warnings
  - `logger.error("message", meta?)` - Errors
  - `logger.request(msg, { method, path, status, duration_ms, correlationId, ... })` - HTTP request logs
  - `logger.errorEvent(msg, { errorId, message, stack, path, method, correlationId })` - Error tracking
- **Log aggregation**: Compatible with ELK, Datadog, Loki, Splunk

### 4. Performance Monitoring

- **Response time tracking**: All HTTP requests logged with duration in milliseconds
- **X-Response-Time header**: Added to all responses
- **Slow request detection**: Requests > 1000ms logged as warnings
- **Database slow query detection**: Queries > 250ms (configurable via `SLOW_QUERY_THRESHOLD_MS`)
- **DB stats object**: `dbStats` in `src/db.ts` exposes `totalQueries`, `slowQueries`, `connectionErrors`, `lastSlowQuery`

### 5. Error Tracking

- **Global error handler**: Catches all unhandled errors, logs structured JSON with correlation ID
- **Error ID**: Unique ID generated for each error for traceability
- **Stack traces**: Included in error logs (omit in production if needed)
- **Error response**: Returns `500` with `{ error, correlationId }` (when available)

## Architecture Diagram

```
Request → Correlation ID → Request Metrics → Rate Limiter → Route Handler
                ↓                ↓                              ↓
         Response Header    Structured Log              Error Handler
                                                   (if error occurs)
                                                            ↓
                                                     Structured Log
                                                     (with correlation ID)
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://...` | Database connection string |
| `SLOW_QUERY_THRESHOLD_MS` | `250` | Threshold (ms) for slow query detection |
| `NODE_ENV` | `development` | Environment name (affects log format/verbosity) |
| `PORT` | `3200` | Server port |

## Troubleshooting

### High Error Rate
1. Check logs for `type: "unhandled_error"` entries
2. Look up specific error by `errorId` and `correlation_id`
3. Check database health at `/api/health/ready`

### Slow Requests
1. Look for `type: "http_request"` with `duration_ms > 1000`
2. Check slow query log: `dbStats.lastSlowQuery`
3. Monitor database pool: `pool_total`, `pool_idle`, `pool_waiting` from health endpoint

### Database Connection Issues
1. Check `/api/health/ready` for database check status
2. Review connection pool stats in health response
3. Verify `DATABASE_URL` environment variable
4. Check for `connectionErrors` in `dbStats`

## Testing

Run monitoring-specific tests:
```bash
npm test -- src/middleware/health.test.ts
npm test -- src/middleware/monitoring.test.ts
```

## Integration with CI/CD

- Health checks integrated into deployment pipeline
- CI pipeline (A-24) verifies build before deployment
- Monitoring endpoints available immediately after server start
- Log format compatible with automated log analysis tools in CI/CD
