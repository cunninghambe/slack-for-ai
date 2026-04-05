/**
 * Authentication middleware for the Slack-for-AI API.
 * 
 * Auth strategy:
 * 1. If routed through Paperclip gateway (X-Paperclip-Run-Id present),
 *    use the already-validated agent context from headers.
 * 2. Otherwise fall back to Bearer token against agent_api_keys table.
 * 3. JWT Bearer token for user authentication (user-facing access).
 */
import type { Request, Response, NextFunction } from "express";
import { db, agents, agentApiKeys, authUsers } from "../db.js";
import { eq, isNull } from "drizzle-orm";
import jwt from "jsonwebtoken";

export interface AuthActor {
  kind: "agent" | "user";
  id: string;
  companyId: string;
  keyName?: string;
}

declare global {
  namespace Express {
    interface Request {
      actor?: AuthActor;
    }
  }
}

/**
 * JWT secret for user tokens.
 * In production, configure via environment variable.
 */
const JWT_SECRET = process.env.JWT_SECRET || "slack-for-ai-dev-secret";

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Strategy 1: Paperclip gateway already validated the API key.
  // Trust the upstream gateway headers.
  const paperclipRunId = req.headers["x-paperclip-run-id"] as string;
  const paperclipAgentId = req.headers["x-paperclip-agent-id"] as string;
  const paperclipCompanyId = req.headers["x-paperclip-company-id"] as string;

  if (paperclipRunId && paperclipAgentId && paperclipCompanyId) {
    req.actor = {
      kind: "agent",
      id: paperclipAgentId,
      companyId: paperclipCompanyId,
    };
    next();
    return;
  }

  // Strategy 2: Direct Bearer token auth (dev/testing)
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader.slice(7);

  // Strategy 3: JWT token validation for user auth
  // Check if the token is a JWT
  if (token.includes(".")) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        sub: string;
        companyId: string;
        kind?: string;
      };
      
      // Validate the user exists
      const user = await db
        .select({
          id: authUsers.id,
        })
        .from(authUsers)
        .where(eq(authUsers.id, decoded.sub))
        .limit(1);

      if (user.length > 0) {
        req.actor = {
          kind: "user" as const,
          id: decoded.sub,
          companyId: decoded.companyId,
        };
        next();
        return;
      }
    } catch (err) {
      // Not a valid JWT — fall through to agent key lookup
    }
  }

  // Strategy 4: Agent API key lookup (raw hash)
  const rawResult = await db
    .select({
      id: agentApiKeys.id,
      agentId: agentApiKeys.agentId,
    })
    .from(agentApiKeys)
    .where(eq(agentApiKeys.keyHash, token))
    .limit(1);

  if (rawResult.length > 0) {
    const agentRecord = await db
      .select({
        id: agents.id,
        companyId: agents.companyId,
        name: agents.name,
        keyName: agents.keyName,
      })
      .from(agents)
      .where(eq(agents.id, rawResult[0].agentId))
      .limit(1);

    if (agentRecord.length > 0) {
      req.actor = {
        kind: "agent",
        id: agentRecord[0].id,
        companyId: agentRecord[0].companyId,
        keyName: agentRecord[0].keyName ?? undefined,
      };
      next();
      return;
    }
  }

  res.status(401).json({ error: "Invalid credentials" });
}

export function requireCompany(companyId: string) {
  return async (_req: Request, res: Response, next: NextFunction) => {
    const actorCompanyId = _req.actor?.companyId;
    if (actorCompanyId !== companyId) {
      res.status(403).json({ error: "Access denied: company mismatch" });
      return;
    }
    next();
  };
}

/**
 * Middleware to ensure the actor is a user (not an agent).
 */
export function requireUser(_req: Request, res: Response, next: NextFunction) {
  if (_req.actor?.kind !== "user") {
    res.status(403).json({ error: "User authentication required" });
    return;
  }
  next();
}

/**
 * Generate a JWT token for a user (for use in tests or user login endpoints).
 */
export function generateUserToken(userId: string, companyId: string): string {
  return jwt.sign(
    { sub: userId, companyId, kind: "user" },
    JWT_SECRET,
    { expiresIn: "24h" }
  );
}
