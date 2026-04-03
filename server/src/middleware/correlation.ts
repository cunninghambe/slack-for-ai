import { Request, Response, NextFunction } from "express";

const CORRELATION_HEADER = "x-correlation-id";
const REQUEST_ID_LENGTH = 12;

/**
 * Generates a short random correlation ID.
 */
function generateId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < REQUEST_ID_LENGTH; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

/**
 * Correlation ID middleware.
 * - Reads existing correlation ID from request headers
 * - Or generates a new one if missing
 * - Attaches it to response headers
 * - Makes it available on req.correlationId
 */
export function correlationId(req: Request, res: Response, next: NextFunction): void {
  const existingId = req.headers[CORRELATION_HEADER];
  const correlationId = typeof existingId === "string" ? existingId : generateId();

  (req as Request & { correlationId: string }).correlationId = correlationId;
  res.set(CORRELATION_HEADER, correlationId);
  next();
}
