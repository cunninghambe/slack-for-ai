/**
 * Structured logger for the Slack-for-AI platform.
 * Produces JSON-formatted log lines for log aggregation systems (ELK, Datadog, Loki).
 *
 * Usage:
 *   import { logger } from "./logger.js";
 *   logger.info("Server started", { port: 3000 });
 *   logger.error("Failed to connect", { error: err.message });
 */

import { randomUUID } from "crypto";

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  correlationId?: string;
  [key: string]: unknown;
}

const SERVICE_NAME = "slack-for-ai";
const NODE_ENV = process.env.NODE_ENV ?? "development";

function formatLog(level: LogLevel, message: string, meta?: Record<string, unknown>): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    service: SERVICE_NAME,
    message,
    env: NODE_ENV,
    ...meta,
  };
}

function emit(entry: LogEntry): void {
  const line = JSON.stringify(entry);
  switch (entry.level) {
    case "debug":
    case "info":
      process.stdout.write(line + "\n");
      break;
    case "warn":
    case "error":
      process.stderr.write(line + "\n");
      break;
  }
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>): void {
    emit(formatLog("debug", message, meta));
  },
  info(message: string, meta?: Record<string, unknown>): void {
    emit(formatLog("info", message, meta));
  },
  warn(message: string, meta?: Record<string, unknown>): void {
    emit(formatLog("warn", message, meta));
  },
  error(message: string, meta?: Record<string, unknown>): void {
    emit(formatLog("error", message, meta));
  },
  request(message: string, meta: {
    method: string;
    path: string;
    status: number;
    duration_ms: number;
    correlationId?: string;
    userAgent?: string;
    ip?: string;
  }): void {
    emit(formatLog("info", message, {
      type: "http_request",
      ...meta,
    }));
  },
  errorEvent(message: string, meta: {
    errorId: string;
    message: string;
    stack?: string;
    path?: string;
    method?: string;
    correlationId?: string;
  }): void {
    emit(formatLog("error", message, {
      type: "unhandled_error",
      ...meta,
    }));
  },
};
