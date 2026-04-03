/**
 * Metrics endpoint for monitoring and alerting.
 * GET /api/metrics - Detailed performance stats
 * 
 * Returns JSON metrics suitable for scraping by monitoring systems
 * (Prometheus, Datadog, etc.) or human dashboards.
 */
import { Router, Request, Response } from "express";
import { pool, dbStats } from "../db.js";
import { logger } from "../utils/logger.js";

const router = Router();
const startTime = Date.now();

function getMemoryUsage() {
  const mu = process.memoryUsage();
  return {
    rss_mb: Math.round(mu.rss / 1024 / 1024 * 100) / 100,
    heap_total_mb: Math.round(mu.heapTotal / 1024 / 1024 * 100) / 100,
    heap_used_mb: Math.round(mu.heapUsed / 1024 / 1024 * 100) / 100,
    external_mb: Math.round(mu.external / 1024 / 1024 * 100) / 100,
    heap_utilization_pct: mu.heapTotal > 0
      ? Math.round(mu.heapUsed / mu.heapTotal * 10000) / 100
      : 0,
  };
}

router.get("/", (_req: Request, res: Response) => {
  const metrics = {
    service: "slack-for-ai",
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.round((Date.now() - startTime) / 1000),
    environment: process.env.NODE_ENV ?? "development",
    memory: getMemoryUsage(),
    database: {
      stats: {
        total_queries: dbStats.totalQueries,
        slow_queries: dbStats.slowQueries,
        connection_errors: dbStats.connectionErrors,
        last_slow_query: dbStats.lastSlowQuery,
      },
      pool: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
        max: 20,
      },
    },
    node: {
      version: process.version,
      platform: process.platform,
      uptime_seconds: Math.round(process.uptime()),
    },
  };

  res.json(metrics);
});

// Prompts-compatible format for scraping
router.get("/prometheus", (_req: Request, res: Response) => {
  const mu = process.memoryUsage();
  const lines = [
    `# HELP slack_ai_uptime_seconds Service uptime in seconds`,
    `# TYPE slack_ai_uptime_seconds gauge`,
    `slack_ai_uptime_seconds ${Math.round((Date.now() - startTime) / 1000)}`,
    `# HELP slack_ai_db_total_queries Total number of database queries`,
    `# TYPE slack_ai_db_total_queries counter`,
    `slack_ai_db_total_queries ${dbStats.totalQueries}`,
    `# HELP slack_ai_db_slow_queries Total number of slow database queries`,
    `# TYPE slack_ai_db_slow_queries counter`,
    `slack_ai_db_slow_queries ${dbStats.slowQueries}`,
    `# HELP slack_ai_db_connection_errors Total number of DB connection errors`,
    `# TYPE slack_ai_db_connection_errors counter`,
    `slack_ai_db_connection_errors ${dbStats.connectionErrors}`,
    `# HELP slack_ai_db_pool_total Total database pool connections`,
    `# TYPE slack_ai_db_pool_total gauge`,
    `slack_ai_db_pool_total ${pool.totalCount}`,
    `# HELP slack_ai_db_pool_idle Idle database pool connections`,
    `# TYPE slack_ai_db_pool_idle gauge`,
    `slack_ai_db_pool_idle ${pool.idleCount}`,
    `# HELP slack_ai_db_pool_waiting Waiting database pool connections`,
    `# TYPE slack_ai_db_pool_waiting gauge`,
    `slack_ai_db_pool_waiting ${pool.waitingCount}`,
    `# HELP slack_ai_memory_rss_bytes Resident set size in bytes`,
    `# TYPE slack_ai_memory_rss_bytes gauge`,
    `slack_ai_memory_rss_bytes ${mu.rss}`,
    `# HELP slack_ai_heap_used_bytes JavaScript heap used in bytes`,
    `# TYPE slack_ai_heap_used_bytes gauge`,
    `slack_ai_heap_used_bytes ${mu.heapUsed}`,
  ];
  res.set("Content-Type", "text/plain; version=0.0.4");
  res.send(lines.join("\n") + "\n");
});

export default router;
