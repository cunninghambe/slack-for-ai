/**
 * GET /api/search/messages?q=<query>&channelId=<optional>&limit=20&offset=0
 * Full-text message search with keyboard-triggered search modal support.
 * Uses SQL LIKE for database-agnostic search (no tsvector/tsquery).
 */
import { Router, Request, Response } from "express";
import { db, channels, messages, agents, authUsers } from "../db.js";
import { and, eq, isNull, desc, sql, ilike, inArray, type SQL } from "drizzle-orm";
import { authenticate } from "../middleware/auth.js";
import { asyncHandler } from "../utils/helpers.js";
import { COMPANY_ID } from "../config.js";

const router = Router();

router.use(authenticate);

/**
 * GET /api/search/messages
 * Query params:
 *   q - search query (required, min 2 chars)
 *   channelId - optional channel filter
 *   limit - max results (default 20, max 50)
 *   offset - pagination offset (default 0)
 */
router.get(
  "/search/messages",
  asyncHandler(async (req: Request, res: Response) => {
    const q = (req.query.q as string | undefined)?.trim();

    if (!q || q.length < 2) {
      res.json({ results: [], total: 0 });
      return;
    }

    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const offset = Number(req.query.offset) || 0;
    const channelId = req.query.channelId as string | undefined;

    // Build WHERE clauses
    const whereClauses: SQL<unknown>[] = [
      ilike(messages.content, `%${q}%`),
      isNull(messages.deletedAt),
      isNull(messages.parentId), // only search top-level messages
    ];

    if (channelId) {
      whereClauses.push(eq(messages.channelId, channelId));
    }

    // Count total matching results
    const countRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(and(...whereClauses));

    const total = Number(countRows[0]?.count ?? 0);

    // Fetch matching messages with channel and sender info
    const messageRows = await db
      .select({
        messageId: messages.id,
        content: messages.content,
        channelId: messages.channelId,
        senderAgentId: messages.senderAgentId,
        senderUserId: messages.senderUserId,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(and(...whereClauses))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset);

    if (messageRows.length === 0) {
      res.json({ results: [], total });
      return;
    }

    // Collect unique channel IDs and sender IDs
    const channelIds = Array.from(new Set(messageRows.map((m) => m.channelId)));
    const agentIds = Array.from(
      new Set(messageRows.map((m) => m.senderAgentId).filter((id): id is string => id !== null))
    );
    const userIds = Array.from(
      new Set(messageRows.map((m) => m.senderUserId).filter((id): id is string => id !== null))
    );

    // Fetch channel names
    const channelRows = channelIds.length > 0
      ? await db
          .select({ id: channels.id, name: channels.name })
          .from(channels)
          .where(and(eq(channels.companyId, COMPANY_ID), inArray(channels.id, channelIds)))
      : [];

    // Fetch agent names
    const agentRows = agentIds.length > 0
      ? await db
          .select({ id: agents.id, name: agents.name })
          .from(agents)
          .where(inArray(agents.id, agentIds))
      : [];

    // Fetch user names
    const userRows = userIds.length > 0
      ? await db
          .select({ id: authUsers.id, name: authUsers.name })
          .from(authUsers)
          .where(inArray(authUsers.id, userIds))
      : [];

    // Build lookup maps
    const channelMap = new Map(channelRows.map((c) => [c.id, c.name]));
    const agentMap = new Map(agentRows.map((a) => [a.id, a.name]));
    const userMap = new Map(userRows.map((u) => [u.id, u.name ?? "User"]));

    // Assemble results
    const results = messageRows.map((m) => ({
      messageId: m.messageId,
      content: m.content ?? "",
      channelId: m.channelId,
      channelName: channelMap.get(m.channelId) ?? "Unknown",
      senderId: m.senderAgentId ?? m.senderUserId ?? "unknown",
      senderName: m.senderAgentId
        ? (agentMap.get(m.senderAgentId) ?? "Unknown Agent")
        : (m.senderUserId
            ? (userMap.get(m.senderUserId) ?? "Unknown User")
            : "Unknown"),
      createdAt: m.createdAt,
    }));

    res.json({ results, total });
  })
);

export default router;
