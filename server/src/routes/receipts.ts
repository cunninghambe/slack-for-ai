/**
 * Read receipt endpoints for per-channel unread tracking.
 *
 * POST /api/channels/:channelId/read — Mark channel as read (upsert)
 * GET  /api/channels/unread-counts  — Get unread counts for all channels the actor is a member of
 */
import { Router, Request, Response } from "express";
import {
  db,
  channels,
  channelReadReceipts,
  channelMemberships,
  messages,
} from "../db.js";
import { eq, and, isNull, sql, gt, count, inArray } from "drizzle-orm";
import { authenticate, requireCompany } from "../middleware/auth.js";
import { paramStr, asyncHandler } from "../utils/helpers.js";
import { COMPANY_ID } from "../config.js";

const router = Router();

router.use(authenticate);
router.use(requireCompany(COMPANY_ID));

/**
 * POST /api/channels/:channelId/read
 * Upsert a read receipt: mark this channel as read up to the latest message.
 */
router.post(
  "/:channelId/read",
  asyncHandler(async (req: Request, res: Response) => {
    const actor = req.actor!;
    const channelId = paramStr(req, "channelId");

    // Verify the channel exists and is not deleted
    const channelRows = await db
      .select()
      .from(channels)
      .where(
        and(
          eq(channels.id, channelId),
          eq(channels.companyId, COMPANY_ID),
          isNull(channels.deletedAt)
        )
      )
      .limit(1);

    if (channelRows.length === 0) {
      res.status(404).json({ error: "Channel not found" });
      return;
    }

    // Get the latest message in this channel (top-level only, not replies)
    const latestMsgRows = await db
      .select({ id: messages.id, createdAt: messages.createdAt })
      .from(messages)
      .where(
        and(
          eq(messages.channelId, channelId),
          isNull(messages.parentId),
          isNull(messages.deletedAt)
        )
      )
      .orderBy(sql`${messages.sequenceNum} DESC`)
      .limit(1);

    const now = new Date();
    const lastReadMessageId = latestMsgRows.length > 0 ? latestMsgRows[0].id : null;

    // Build the unique constraint column based on actor kind
    if (actor.kind === "agent") {
      await db
        .insert(channelReadReceipts)
        .values({
          channelId,
          agentId: actor.id,
          userId: null,
          lastReadMessageId,
          lastReadAt: now,
        } as any)
        .onConflictDoUpdate({
          target: [channelReadReceipts.channelId, channelReadReceipts.agentId],
          set: {
            lastReadMessageId,
            lastReadAt: now,
          } as any,
        });
    } else {
      await db
        .insert(channelReadReceipts)
        .values({
          channelId,
          agentId: null,
          userId: actor.id,
          lastReadMessageId,
          lastReadAt: now,
        } as any)
        .onConflictDoUpdate({
          target: [channelReadReceipts.channelId, channelReadReceipts.userId],
          set: {
            lastReadMessageId,
            lastReadAt: now,
          } as any,
        });
    }

    res.json({ ok: true });
  })
);

/**
 * GET /api/channels/unread-counts
 * Returns unread message counts for each channel the actor is a member of.
 */
router.get(
  "/unread-counts",
  asyncHandler(async (req: Request, res: Response) => {
    const actor = req.actor!;

    // Get all channels the actor is a member of (active membership)
    const membershipCondition =
      actor.kind === "agent"
        ? and(
            eq(channelMemberships.agentId, actor.id),
            isNull(channelMemberships.leftAt)
          )
        : and(
            eq(channelMemberships.userId, actor.id),
            isNull(channelMemberships.leftAt)
          );

    const memberships = await db
      .select({ channelId: channelMemberships.channelId })
      .from(channelMemberships)
      .where(membershipCondition);

    if (memberships.length === 0) {
      res.json({ counts: {} });
      return;
    }

    const channelIds = memberships.map((m) => m.channelId);

    // Get read receipts for this actor
    const receiptCondition =
      actor.kind === "agent"
        ? and(
            inArray(channelReadReceipts.channelId, channelIds),
            eq(channelReadReceipts.agentId, actor.id)
          )
        : and(
            inArray(channelReadReceipts.channelId, channelIds),
            eq(channelReadReceipts.userId, actor.id)
          );

    const receipts = await db
      .select({
        channelId: channelReadReceipts.channelId,
        lastReadAt: channelReadReceipts.lastReadAt,
      })
      .from(channelReadReceipts)
      .where(receiptCondition);

    // Build a map of channelId -> lastReadAt
    const readAtMap = new Map<string, Date>();
    for (const r of receipts) {
      readAtMap.set(r.channelId, r.lastReadAt);
    }

    // For channels without a receipt, count ALL messages
    // For channels with a receipt, count messages after lastReadAt
    const counts: Record<string, number> = {};

    for (const ch of memberships) {
      const lastReadAt = readAtMap.get(ch.channelId);
      const whereClauses = [
        eq(messages.channelId, ch.channelId),
        isNull(messages.deletedAt),
      ];
      if (lastReadAt) {
        whereClauses.push(gt(messages.createdAt, lastReadAt));
      }
      const messageCount = await db
        .select({ cnt: count() })
        .from(messages)
        .where(and(...(whereClauses as [any, ...any[]])));
      counts[ch.channelId] = messageCount[0]?.cnt ?? 0;
    }

    res.json({ counts });
  })
);

export { router as receiptsRouter };
