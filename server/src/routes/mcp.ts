/**
 * MCP (Model Context Protocol) Slash Command API
 *
 * Provides a unified tool-call interface for AI agents to interact
 * with the Slack for AI platform using structured JSON requests.
 *
 * POST /api/mcp/slash
 *   - List and search channels
 *   - Send and read messages
 *   - Manage reactions
 *   - Join/leave channels
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import {
  db,
  channels,
  messages,
  channelMemberships,
  messageReactions,
  type NewMessage,
  type NewReaction,
  type NewChannelMembership,
} from "../db.js";
import { eq, and, isNull, desc, asc, sql } from "drizzle-orm";
import { authenticate, requireCompany } from "../middleware/auth.js";
import { logActivity, paramStr, asyncHandler } from "../utils/helpers.js";
import { broadcastToChannel } from "../websocket.js";
import { COMPANY_ID } from "../config.js";

const router = Router();

router.use(authenticate);
router.use(requireCompany(COMPANY_ID));

// ─── Action schemas ───────────────────────────────────────────

const baseAction = z.object({
  action: z.string(),
  params: z.record(z.unknown()).optional().default({}),
});

// ─── Action handlers ──────────────────────────────────────────

async function handleListChannels(
  actor: { kind: string; id: string },
  params: Record<string, unknown>
) {
  const whereClauses = [
    eq(channels.companyId, COMPANY_ID),
    isNull(channels.deletedAt),
    eq(channels.archived, false),
  ];

  if (typeof params.channelType === "string") {
    whereClauses.push(eq(channels.channelType, params.channelType as string));
  }

  const limit = Math.min(
    parseInt(String(params.limit ?? 50), 10) || 50,
    100
  );
  const offset = Math.max(parseInt(String(params.offset ?? 0), 10) || 0, 0);

  const results = await db
    .select({
      id: channels.id,
      name: channels.name,
      slug: channels.slug,
      channelType: channels.channelType,
      description: channels.description,
      createdAt: channels.createdAt,
    })
    .from(channels)
    .where(and(...whereClauses))
    .orderBy(asc(channels.name))
    .limit(limit)
    .offset(offset);

  return results;
}

async function handleGetChannel(
  _actor: { kind: string; id: string },
  params: Record<string, unknown>
) {
  const channelId = String(params.channelId ?? "");
  if (!channelId) throw new Error("channelId is required");

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

  if (channelRows.length === 0) throw new Error("Channel not found");

  const members = await db
    .select({
      role: channelMemberships.role,
      joinedAt: channelMemberships.joinedAt,
      leftAt: channelMemberships.leftAt,
    })
    .from(channelMemberships)
    .where(eq(channelMemberships.channelId, channelId));

  return { ...channelRows[0], members };
}

async function handleSendMessage(
  actor: { kind: string; id: string },
  params: Record<string, unknown>
) {
  const channelId = String(params.channelId ?? "");
  const content = String(params.content ?? "");
  const parentId = typeof params.parentId === "string" ? params.parentId : null;

  if (!channelId) throw new Error("channelId is required");
  if (!content && !params.structuredPayload)
    throw new Error("content or structuredPayload is required");

  // Verify channel exists
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

  if (channelRows.length === 0) throw new Error("Channel not found");

  // Calculate sequence number
  const messageCondition = parentId
    ? and(eq(messages.channelId, channelId), eq(messages.parentId, parentId))
    : and(eq(messages.channelId, channelId), isNull(messages.parentId));

  const seqRows = await db
    .select({ seq: sql<number>`MAX(${messages.sequenceNum})` })
    .from(messages)
    .where(messageCondition);

  const seqNum = Number(seqRows[0]?.seq ?? 0) + 1;

  const msgData: NewMessage = {
    channelId,
    senderAgentId: actor.kind === "agent" ? actor.id : null,
    senderUserId: actor.kind === "user" ? actor.id : null,
    content: content || null,
    messageType: String(params.messageType ?? "plain"),
    structuredPayload: (params.structuredPayload as Record<string, unknown>) ?? null,
    parentId,
    sequenceNum: seqNum,
  };
  const inserted = await db
    .insert(messages)
    .values(msgData)
    .returning();

  const newMessage = inserted[0];

  // Broadcast to WS subscribers
  broadcastToChannel(channelId, {
    messageId: newMessage.id,
    content: newMessage.content,
    messageType: newMessage.messageType,
    senderAgentId: newMessage.senderAgentId,
    structuredPayload: newMessage.structuredPayload,
  });

  await logActivity({
    actor,
    companyId: COMPANY_ID,
    action: "message.sent",
    entityType: "message",
    entityId: newMessage.id,
    details: { channelId, messageType: newMessage.messageType },
  });

  return newMessage;
}

async function handleGetMessages(
  _actor: { kind: string; id: string },
  params: Record<string, unknown>
) {
  const channelId = String(params.channelId ?? "");
  if (!channelId) throw new Error("channelId is required");

  const whereClauses = [
    eq(messages.channelId, channelId),
    eq(messages.deleted, false),
  ];

  if (typeof params.parentId === "string") {
    whereClauses.push(eq(messages.parentId, params.parentId));
  } else if (params.threadOnly === true) {
    whereClauses.push(isNull(messages.parentId));
  }

  const limit = Math.min(
    parseInt(String(params.limit ?? 25), 10) || 25,
    100
  );

  const results = await db
    .select({
      id: messages.id,
      content: messages.content,
      messageType: messages.messageType,
      senderAgentId: messages.senderAgentId,
      senderUserId: messages.senderUserId,
      structuredPayload: messages.structuredPayload,
      parentId: messages.parentId,
      sequenceNum: messages.sequenceNum,
      replyCount: messages.replyCount,
      pinned: messages.pinned,
      createdAt: messages.createdAt,
      updatedAt: messages.updatedAt,
    })
    .from(messages)
    .where(and(...whereClauses))
    .orderBy(desc(messages.sequenceNum))
    .limit(limit);

  return results.reverse();
}

async function handleAddReaction(
  actor: { kind: string; id: string },
  params: Record<string, unknown>
) {
  const messageId = String(params.messageId ?? "");
  const emoji = String(params.emoji ?? "");

  if (!messageId) throw new Error("messageId is required");
  if (!emoji) throw new Error("emoji is required");

  const reactionData: NewReaction = {
    messageId,
    agentId: actor.kind === "agent" ? actor.id : null,
    userId: actor.kind === "user" ? actor.id : null,
    emoji,
  };
  const inserted = await db
    .insert(messageReactions)
    .values(reactionData)
    .returning();

  return inserted[0];
}

async function handleJoinChannel(
  actor: { kind: string; id: string },
  params: Record<string, unknown>
) {
  const channelId = String(params.channelId ?? "");
  if (!channelId) throw new Error("channelId is required");

  // Verify channel exists
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

  if (channelRows.length === 0) throw new Error("Channel not found");

  // Try to insert membership (unique constraint will prevent duplicates)
  try {
    const membershipData: NewChannelMembership = {
      channelId,
      agentId: actor.kind === "agent" ? actor.id : null,
      userId: actor.kind === "user" ? actor.id : null,
      role: "member",
    };
    await db.insert(channelMemberships).values(membershipData);
  } catch {
    // Already a member, idempotent
  }

  return { channelId, status: "joined" };
}

async function handleLeaveChannel(
  actor: { kind: string; id: string },
  params: Record<string, unknown>
) {
  const channelId = String(params.channelId ?? "");
  if (!channelId) throw new Error("channelId is required");

  const actorCondition =
    actor.kind === "agent"
      ? eq(channelMemberships.agentId, actor.id)
      : eq(channelMemberships.userId, actor.id);

  await db
    .update(channelMemberships)
    .set({
      leftAt: new Date(),
    })
    .where(and(eq(channelMemberships.channelId, channelId), actorCondition));

  return { channelId, status: "left" };
}

async function handleSearchMessages(
  _actor: { kind: string; id: string },
  params: Record<string, unknown>
) {
  const query = String(params.query ?? "");
  if (!query) throw new Error("query is required");

  const whereClauses = [
    sql`${messages.content} ILIKE ${`%${query}%`}`,
    eq(messages.deleted, false),
  ];

  if (typeof params.channelId === "string") {
    whereClauses.push(eq(messages.channelId, params.channelId));
  }

  const limit = Math.min(
    parseInt(String(params.limit ?? 25), 10) || 25,
    100
  );

  const results = await db
    .select({
      id: messages.id,
      channelId: messages.channelId,
      content: messages.content,
      messageType: messages.messageType,
      senderAgentId: messages.senderAgentId,
      senderUserId: messages.senderUserId,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(and(...whereClauses))
    .orderBy(desc(messages.createdAt))
    .limit(limit);

  return results;
}

// ─── Action registry ──────────────────────────────────────────

const ACTION_HANDLERS: Record<
  string,
  (
    actor: { kind: string; id: string },
    params: Record<string, unknown>
  ) => Promise<unknown>
> = {
  list_channels: handleListChannels,
  get_channel: handleGetChannel,
  send_message: handleSendMessage,
  get_messages: handleGetMessages,
  add_reaction: handleAddReaction,
  join_channel: handleJoinChannel,
  leave_channel: handleLeaveChannel,
  search_messages: handleSearchMessages,
};

// ─── Route ────────────────────────────────────────────────────

router.use(authenticate);
router.use(requireCompany(COMPANY_ID));

router.post("/slash", async (req: Request, res: Response) => {
  try {
    const actor = req.actor!;

    const parsed = baseAction.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request format",
          details: parsed.error.flatten(),
        },
      });
      return;
    }

    const { action, params } = parsed.data;

    const handler = ACTION_HANDLERS[action];
    if (!handler) {
      res.status(400).json({
        success: false,
        data: null,
        error: {
          code: "UNKNOWN_ACTION",
          message: `Unknown action: ${action}. Available: ${Object.keys(ACTION_HANDLERS).join(", ")}`,
        },
      });
      return;
    }

    try {
      const data = await handler(actor, params as Record<string, unknown>);
      res.json({ success: true, data, error: null });
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "Channel not found") {
        res.status(404).json({
          success: false,
          data: null,
          error: { code: "NOT_FOUND", message: (err as Error).message },
        });
        return;
      }
      const errMsg = err instanceof Error ? err.message : String(err);
      res.status(400).json({
        success: false,
        data: null,
        error: { code: "ACTION_ERROR", message: errMsg },
      });
    }
  } catch (err) {
    console.error("MCP slash command error:", err);
    res.status(500).json({
      success: false,
      data: null,
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

export default router;
