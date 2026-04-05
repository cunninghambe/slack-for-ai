import { Request, Response, NextFunction } from "express";
import { db, activityLog, messages } from "../db.js";
import { eq, and, isNull, max } from "drizzle-orm";

export type ActivityInsert = typeof activityLog.$inferInsert;

export function paramStr(req: Request, key: string): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] ?? "" : val ?? "";
}

export function asyncHandler(
  fn: (req: Request, res: Response) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

export async function logActivity(opts: {
  actor?: { kind: string; id: string };
  companyId: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  const data: ActivityInsert = {
    companyId: opts.companyId,
    actorType: opts.actor?.kind ?? "system",
    actorId: opts.actor?.id ?? null,
    action: opts.action,
    entityType: opts.entityType,
    entityId: opts.entityId,
    details: opts.details ?? null,
  } as ActivityInsert;
  await db.insert(activityLog).values(data);
}

export async function getNextSequenceNum(
  channelId: string,
  parentId: string | null
): Promise<number> {
  const condition = parentId
    ? and(eq(messages.channelId, channelId), eq(messages.parentId, parentId))
    : and(eq(messages.channelId, channelId), isNull(messages.parentId));

  const rows = await db
    .select({ seq: max(messages.sequenceNum) })
    .from(messages)
    .where(condition);

  const maxSeq = rows[0]?.seq;
  return Number(maxSeq ?? 0) + 1;
}
