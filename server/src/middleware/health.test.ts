/**
 * Integration tests for monitoring, logging, and health endpoints.
 */
import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import healthRouter from "../routes/health.js";
import { requestMetrics } from "../middleware/monitoring.js";
import { correlationId } from "../middleware/correlation.js";

describe("Health Check Endpoints", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/health/live", () => {
    it("should return 200 with ok status", async () => {
      const app = express();
      app.use("/api/health", healthRouter);

      const res = await request(app).get("/api/health/live");

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        status: "ok",
        service: "slack-for-ai",
        version: expect.any(String),
      });
      expect(res.body).toHaveProperty("uptime_seconds");
    });
  });

  describe("GET /api/health/ready", () => {
    it("should return status based on database connectivity", async () => {
      const app = express();
      app.use("/api/health", healthRouter);

      const res = await request(app).get("/api/health/ready");

      // Could be 200 (ready) or 503 (not ready) depending on DB state
      expect([200, 503]).toContain(res.status);
      expect(res.body).toHaveProperty("status");
      expect(res.body.checks).toHaveProperty("database");
    });
  });

  describe("GET /api/health", () => {
    it("should return full health details with correlation ID", async () => {
      const app = express();
      app.use(correlationId);
      app.use("/api/health", healthRouter);

      const res = await request(app)
        .get("/api/health")
        .set("X-Correlation-ID", "test-corr-id-123");

      expect([200, 503]).toContain(res.status);
      expect(res.body).toMatchObject({
        status: expect.stringMatching(/^(ok|degraded|unhealthy)$/),
        service: "slack-for-ai",
        version: expect.any(String),
        timestamp: expect.any(String),
        checks: {
          database: expect.any(Object),
        },
        environment: expect.any(String),
      });
      expect(res.body).toHaveProperty("correlation_id", "test-corr-id-123");
    });
  });
});

describe("Correlation ID Middleware", () => {
  it("should pass existing correlation ID through", () => {
    const app = express();
    app.use(correlationId);
    app.get("/test", (req, res) => {
      res.setHeader("X-Response-Correlation-Id", (req as express.Request & { correlationId?: string }).correlationId || "");
      res.json({ ok: true });
    });

    return request(app)
      .get("/test")
      .set("X-Correlation-Id", "my-custom-id")
      .expect("x-correlation-id", "my-custom-id")
      .expect("X-Response-Correlation-Id", "my-custom-id")
      .expect(200);
  });

  it("should generate a new correlation ID if none provided", async () => {
    const app = express();
    app.use(correlationId);
    app.get("/test", (req, res) => {
      res.setHeader("X-Response-Correlation-Id", (req as express.Request & { correlationId?: string }).correlationId || "");
      res.json({ ok: true });
    });

    const res = await request(app).get("/test").expect(200);
    const corrId = res.headers["x-correlation-id"];
    expect(corrId).toMatch(/^[a-z0-9]{12}$/);
  });
});
