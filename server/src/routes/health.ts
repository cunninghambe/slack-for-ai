/**
 * Health check route for the Slack-for-AI platform.
 * GET /api/health - Returns detailed health status
 * GET /api/health/live - Kubernetes liveness probe
 * GET /api/health/ready - Kubernetes readiness probe
 */
import { Router, Request, Response } from "express";
import { pool, dbStats } from "../db.js";
import { logger } from "../utils/logger.js";
import { getTotalConnectionCount, getActiveChannelCount } from "../ws.js";

const router = Router();
const startTs = Date.now();
const VERSION = process.env.npm_package_version ?? "1.0.0";

interface HealthCheckResult {
  status: "ok" | "degraded" | "unhealthy";
  details?: Record<string, unknown>;
}

async function checkDatabase(): Promise<HealthCheckResult> {
  try {
    const client = await pool.connect();
    try {
      const start = performance.now();
      await client.query("SELECT 1 as health");
      const duration = Math.round(performance.now() - start);
      return {
        status: "ok",
        details: {
          connection_time_ms: duration,
          pool_total: pool.totalCount,
          pool_idle: pool.idleCount,
          pool_waiting: pool.waitingCount,
        },
      };
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error("Database health check failed", { error: String(err) });
    return {
      status: "unhealthy",
      details: { error: String(err) },
    };
  }
}

// GET /api/health/live - Simple liveness check (is the process running?)
router.get("/live", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "slack-for-ai",
    version: VERSION,
    uptime_seconds: Math.round((Date.now() - startTs) / 1000),
  });
});

// GET /api/health/ready - Readiness check (can we handle requests?)
router.get("/ready", async (_req: Request, res: Response) => {
  const dbHealth = await checkDatabase();
  const isReady = dbHealth.status === "ok";

  res.status(isReady ? 200 : 503).json({
    status: isReady ? "ready" : "not_ready",
    checks: {
      database: dbHealth,
    },
  });
});

// GET /api/health - Full health check with all details
router.get("/", async (req: Request, res: Response) => {
  const dbHealth = await checkDatabase();

  const overall =
    dbHealth.status === "unhealthy"
      ? "unhealthy"
      : dbHealth.status === "degraded"
      ? "degraded"
      : "ok";

  const health = {
    status: overall,
    service: "slack-for-ai",
    version: VERSION,
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.round((Date.now() - startTs) / 1000),
    correlation_id: (req as Request & { correlationId?: string }).correlationId,
    checks: {
      database: dbHealth,
      websocket: {
        total_connections: getTotalConnectionCount(),
        active_channels: getActiveChannelCount(),
      },
      db_queries: {
        total: dbStats.totalQueries,
        slow: dbStats.slowQueries,
        connection_errors: dbStats.connectionErrors,
      },
    },
    environment: process.env.NODE_ENV ?? "development",
  };

  const statusCode =
    overall === "unhealthy" ? 503 : overall === "degraded" ? 200 : 200;

  res.status(statusCode).json(health);
});

export default router;
