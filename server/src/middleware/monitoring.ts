import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";

/**
 * Request timing and metrics middleware.
 * Adds timing headers, correlation-aware structured logging, and performance monitoring.
 */
export function requestMetrics(
  req: Request & { correlationId?: string },
  res: Response,
  next: NextFunction
): void {
  const start = process.hrtime.bigint();

  // Add response time header
  res.on("finish", () => {
    const duration = Number(process.hrtime.bigint() - start) / 1_000_000; // ms
    const method = req.method;
    const path = req.route?.path ?? req.path;
    const status = res.statusCode;

    // Set response time header for monitoring tools
    res.set("X-Response-Time", `${Math.round(duration)}ms`);

    // Log structured metrics using the structured logger
    logger.request(`${method} ${path} ${status}`, {
      method,
      path,
      status,
      duration_ms: Math.round(duration * 100) / 100,
      correlationId: req.correlationId,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });

    // Track slow requests (>1000ms) as warnings
    if (duration > 1_000_000_000) {
      logger.warn("Slow request detected", {
        method,
        path,
        status,
        duration_ms: Math.round(duration / 1_000_000),
        correlationId: req.correlationId,
      });
    }
  });

  next();
}

/**
 * Health check response with detailed system status.
 * Use as: GET /health
 */
interface HealthStatus {
  status: "ok" | "degraded" | "unhealthy";
  service: string;
  version: string;
  timestamp: string;
  uptime: number;
  checks: Record<string, { status: string; [key: string]: unknown }>;
}

const HEALTH_CHECKS: Array<{
  name: string;
  check: () => Promise<{ status: string; [key: string]: unknown }>;
}> = [];

export function registerHealthCheck(
  name: string,
  check: () => Promise<{ status: string; [key: string]: unknown }>
): void {
  HEALTH_CHECKS.push({ name, check });
}

export async function healthCheck(): Promise<HealthStatus> {
  const checks: Record<string, { status: string; [key: string]: unknown }> = {};
  let overall: "ok" | "degraded" | "unhealthy" = "ok";

  for (const { name, check } of HEALTH_CHECKS) {
    try {
      checks[name] = await check();
      if (checks[name].status === "unhealthy") {
        overall = "unhealthy";
      } else if (checks[name].status === "degraded" && overall !== "unhealthy") {
        overall = "degraded";
      }
    } catch (err) {
      checks[name] = { status: "unhealthy", error: String(err) };
      overall = "unhealthy";
    }
  }

  return {
    status: overall,
    service: "slack-for-ai",
    version: process.env.npm_package_version ?? "1.0.0",
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    checks,
  };
}

/**
 * Error tracking middleware - catches unhandled exceptions and logs them.
 */
export function errorTracker(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const errorId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  // Log structured error for log aggregation systems
  console.error(
    JSON.stringify({
      ts: new Date().toISOString(),
      type: "unhandled_error",
      errorId,
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      ip: req.ip,
    })
  );

  // In production, send to error tracking service (Sentry, DataDog, etc.)
  // TODO: Replace with actual error tracking integration
  // e.g., Sentry.captureException(err, { req });

  if (!res.headersSent) {
    res.status(500).json({
      error: "Internal server error",
      errorId,
    });
  }
}

/**
 * Rate limiter middleware (simple in-memory implementation).
 * For production, use Redis-backed rate limiting.
 */
interface RateLimiterEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimiterEntry>();

export function rateLimiter(opts: {
  windowMs: number;
  maxRequests: number;
}) {
  return function rateLimit(req: Request, res: Response, next: NextFunction): void {
    const ip = req.ip ?? "unknown";
    const now = Date.now();
    const entry = rateLimitStore.get(ip);

    if (!entry || now > entry.resetAt) {
      rateLimitStore.set(ip, { count: 1, resetAt: now + opts.windowMs });
      next();
      return;
    }

    if (entry.count >= opts.maxRequests) {
      res.set({
        "Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(entry.resetAt),
      });
      res.status(429).json({
        error: "Too many requests",
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      });
      return;
    }

    entry.count++;
    res.set({
      "X-RateLimit-Remaining": String(opts.maxRequests - entry.count),
      "X-RateLimit-Reset": String(entry.resetAt),
    });
    next();
  };
}

// Clean up expired rate limiter entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 60_000);
