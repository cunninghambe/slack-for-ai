/**
 * Authentication middleware for the Slack-for-AI API.
 * 
 * Auth strategy:
 * 1. If routed through Paperclip gateway (X-Paperclip-Run-Id present),
 *    use the already-validated agent context from headers.
 * 2. Otherwise fall back to Bearer token against agent_api_keys table.
 */
import type { Request, Response, NextFunction } from "express";
import { db, agents, agentApiKeys } from "../db.js";
import { eq, isNull } from "drizzle-orm";

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

  // Raw token lookup in key_hash column
  const rawResult = await db
    .select({
      id: agentApiKeys.id,
      agentId: agentApiKeys.agentId,
    })
    .from(agentApiKeys)
    .where(eq(agentApiKeys.keyHash, token) as any)
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
