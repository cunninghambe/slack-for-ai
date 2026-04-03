import { db, activityLog, messages } from "../db.js";
import { eq, and, isNull, max } from "drizzle-orm";

export async function logActivity(opts: {
  actor?: any;
  companyId: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(activityLog).values({
    companyId: opts.companyId,
    actorType: opts.actor?.kind ?? "system",
    actorId: opts.actor?.id ?? null,
    action: opts.action,
    entityType: opts.entityType,
    entityId: opts.entityId,
    details: (opts.details ?? {}) as any,
  } as any);
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
