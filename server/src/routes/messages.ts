import { Router, Request, Response } from "express";
import { z } from "zod";
import { db, channels, messages, channelMemberships } from "../db.js";
import { eq, and, isNull, desc, sql } from "drizzle-orm";
import { authenticate } from "../middleware/auth.js";
import { broadcastToChannel } from "../index.js";
import { logActivity, getNextSequenceNum } from "../utils/helpers.js";

const router = Router();
const COMPANY_ID = "91d80478-1fd3-4025-8ec1-5bf3aed65665";

router.use(authenticate);

function strParam(req: Request, key: string): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] ?? "" : val ?? "";
}

// Validation schemas
const sendMessageSchema = z.object({
  content: z.string().min(1).max(10000).optional(),
  messageType: z.enum(["plain", "structured", "system"]).default("plain"),
  structuredPayload: z.record(z.unknown()).optional(),
  parentId: z.string().uuid().optional(),
});

const editMessageSchema = z.object({
  content: z.string().min(1).max(10000),
});

/**
 * GET /api/channels/:channelId/messages - Get message history
 * Query params: limit (default 50), before (sequence number), parentId (for threads)
 */
router.get("/:channelId/messages", async (req: Request, res: Response) => {
  try {
    const actor = req.actor!;
    const channelId = strParam(req, "channelId");

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

    if (channelRows.length === 0) {
      res.status(404).json({ error: "Channel not found" });
      return;
    }

    const channel = channelRows[0];

    // For private channels, verify membership
    if (channel.channelType === "private" || channel.channelType === "group_dm") {
      const membershipRows = await db
        .select()
        .from(channelMemberships)
        .where(
          and(
            eq(channelMemberships.channelId, channelId),
            actor.kind === "agent"
              ? eq(channelMemberships.agentId, actor.id)
              : eq(channelMemberships.userId, actor.id),
            isNull(channelMemberships.leftAt)
          )
        )
        .limit(1);

      if (membershipRows.length === 0) {
        res.status(403).json({ error: "Not a member of this channel" });
        return;
      }
    }

    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const before = req.query.before as string | undefined;
    const parentId = req.query.parentId as string | undefined;

    const whereClauses = [
      eq(messages.channelId, channelId),
      isNull(messages.deletedAt),
    ];

    if (before) {
      whereClauses.push(
        sql`${messages.sequenceNum} < ${Number(before)}` as any
      );
    }

    if (parentId) {
      whereClauses.push(eq(messages.parentId, parentId));
    } else {
      whereClauses.push(isNull(messages.parentId));
    }

    const messageList = await db
      .select({
        id: messages.id,
        channelId: messages.channelId,
        parentId: messages.parentId,
        senderAgentId: messages.senderAgentId,
        senderUserId: messages.senderUserId,
        content: messages.content,
        messageType: messages.messageType,
        structuredPayload: messages.structuredPayload,
        edited: messages.edited,
        editedAt: messages.editedAt,
        pinned: messages.pinned,
        pinnedAt: messages.pinnedAt,
        sequenceNum: messages.sequenceNum,
        replyCount: messages.replyCount,
        createdAt: messages.createdAt,
        updatedAt: messages.updatedAt,
      })
      .from(messages)
      .where(and(...whereClauses))
      .orderBy(desc(messages.sequenceNum))
      .limit(limit);

    res.json({
      messages: messageList.reverse(),
      hasMore: messageList.length >= limit,
    });
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

/**
 * POST /api/channels/:channelId/messages - Send a message
 */
router.post("/:channelId/messages", async (req: Request, res: Response) => {
  try {
    const actor = req.actor!;
    const channelId = strParam(req, "channelId");

    const validation = sendMessageSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(422).json({
        error: "Validation failed",
        details: validation.error.flatten(),
      });
      return;
    }

    const { content, messageType, structuredPayload, parentId } = validation.data;

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

    if (channelRows.length === 0) {
      res.status(404).json({ error: "Channel not found" });
      return;
    }

    const channel = channelRows[0];

    // For private channels, verify membership
    if (channel.channelType === "private" || channel.channelType === "group_dm") {
      const membershipRows = await db
        .select()
        .from(channelMemberships)
        .where(
          and(
            eq(channelMemberships.channelId, channelId),
            actor.kind === "agent"
              ? eq(channelMemberships.agentId, actor.id)
              : eq(channelMemberships.userId, actor.id),
            isNull(channelMemberships.leftAt)
          )
        )
        .limit(1);

      if (membershipRows.length === 0) {
        res.status(403).json({ error: "Not a member of this channel" });
        return;
      }
    }

    // If parentId provided, verify it exists
    const parentMessages = parentId
      ? await db
          .select()
          .from(messages)
          .where(and(eq(messages.id, parentId), eq(messages.channelId, channelId)))
          .limit(1)
      : [];

    if (parentId && parentMessages.length === 0) {
      res.status(404).json({ error: "Parent message not found" });
      return;
    }

    const sequenceNum = await getNextSequenceNum(channelId, parentId ?? null);

    const inserted = await db
      .insert(messages)
      .values({
        channelId,
        parentId: parentId ?? null,
        senderAgentId: actor.kind === "agent" ? actor.id : null,
        senderUserId: actor.kind === "user" ? actor.id : null,
        content: content ?? null,
        messageType,
        structuredPayload: (structuredPayload as any) ?? null,
        sequenceNum,
      } as any)
      .returning();

    const newMessage = inserted[0];

    // Update parent's reply count if this is a thread reply
    if (parentId) {
      await db
        .update(messages)
        .set({
          replyCount: sql`${messages.replyCount} + 1`,
        } as any)
        .where(eq(messages.id, parentId));
    }

    await logActivity({
      actor,
      companyId: COMPANY_ID,
      action: "message.sent",
      entityType: "message",
      entityId: newMessage.id,
      details: { channelId, parentId: parentId ?? null },
    });

    res.status(201).json(newMessage);
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

/**
 * GET /api/channels/:channelId/messages/:id - Get a single message
 */
router.get("/:channelId/messages/:id", async (req: Request, res: Response) => {
  try {
    const id = strParam(req, "id");

    const rows = await db
      .select()
      .from(messages)
      .where(and(eq(messages.id, id), isNull(messages.deletedAt)))
      .limit(1);

    if (rows.length === 0) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching message:", err);
    res.status(500).json({ error: "Failed to fetch message" });
  }
});

/**
 * PATCH /api/channels/:channelId/messages/:id - Edit a message
 */
router.patch(
  "/:channelId/messages/:id",
  async (req: Request, res: Response) => {
    try {
      const actor = req.actor!;
      const id = strParam(req, "id");

      const validation = editMessageSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(422).json({
          error: "Validation failed",
          details: validation.error.flatten(),
        });
        return;
      }

      const existing = await db
        .select()
        .from(messages)
        .where(and(eq(messages.id, id), isNull(messages.deletedAt)))
        .limit(1);

      if (existing.length === 0) {
        res.status(404).json({ error: "Message not found" });
        return;
      }

      const msg = existing[0];

      // Only sender can edit
      if (
        (actor.kind === "agent" && msg.senderAgentId !== actor.id) ||
        (actor.kind === "user" && msg.senderUserId !== actor.id)
      ) {
        res.status(403).json({ error: "Not authorized to edit this message" });
        return;
      }

      const updated = await db
        .update(messages)
        .set({
          content: validation.data.content,
          edited: true,
          editedAt: new Date(),
        } as any)
        .where(eq(messages.id, id))
        .returning();

      await logActivity({
        actor,
        companyId: COMPANY_ID,
        action: "message.edited",
        entityType: "message",
        entityId: id,
      });

      res.json(updated[0]);
    } catch (err) {
      console.error("Error editing message:", err);
      res.status(500).json({ error: "Failed to edit message" });
    }
  }
);

/**
 * DELETE /api/channels/:channelId/messages/:id - Soft delete a message
 */
router.delete(
  "/:channelId/messages/:id",
  async (req: Request, res: Response) => {
    try {
      const actor = req.actor!;
      const id = strParam(req, "id");

      const existing = await db
        .select()
        .from(messages)
        .where(and(eq(messages.id, id), isNull(messages.deletedAt)))
        .limit(1);

      if (existing.length === 0) {
        res.status(404).json({ error: "Message not found" });
        return;
      }

      const msg = existing[0];

      // Only sender can delete
      if (
        (actor.kind === "agent" && msg.senderAgentId !== actor.id) ||
        (actor.kind === "user" && msg.senderUserId !== actor.id)
      ) {
        res.status(403).json({ error: "Not authorized to delete this message" });
        return;
      }

      await db
        .update(messages)
        .set({
          deleted: true,
          deletedAt: new Date(),
          deletedByAgentId: actor.kind === "agent" ? actor.id : null,
          deletedByUserId: actor.kind === "user" ? actor.id : null,
        } as any)
        .where(eq(messages.id, id));

      await logActivity({
        actor,
        companyId: COMPANY_ID,
        action: "message.deleted",
        entityType: "message",
        entityId: id,
      });

      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting message:", err);
      res.status(500).json({ error: "Failed to delete message" });
    }
  }
);

export default router;
