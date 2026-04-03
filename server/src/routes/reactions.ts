import { Router, Request, Response } from "express";
import { z } from "zod";
import { db, messages, messageReactions } from "../db.js";
import { eq, and, isNull, sql, count } from "drizzle-orm";
import { authenticate } from "../middleware/auth.js";
import { logActivity } from "../utils/helpers.js";

const router = Router();
const COMPANY_ID = "91d80478-1fd3-4025-8ec1-5bf3aed65665";

router.use(authenticate);

const addReactionSchema = z.object({
  emoji: z.string().min(1).max(64),
});

function getParam(req: Request, key: string): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] ?? "" : (val ?? "");
}

/** POST /api/messages/:messageId/reactions - Add a reaction */
router.post("/:messageId/reactions", async (req: Request, res: Response) => {
  try {
    const actor = req.actor!;
    const messageId = getParam(req, "messageId");

    const validation = addReactionSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(422).json({
        error: "Validation failed",
        details: validation.error.flatten(),
      });
      return;
    }

    const { emoji } = validation.data;

    // Verify message exists and not deleted
    const msgRows = await db
      .select()
      .from(messages)
      .where(and(eq(messages.id, messageId), isNull(messages.deletedAt)))
      .limit(1);

    if (msgRows.length === 0) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    // Check for existing reaction
    const existing = await db
      .select()
      .from(messageReactions)
      .where(
        and(
          eq(messageReactions.messageId, messageId),
          eq(messageReactions.emoji, emoji),
          actor.kind === "agent"
            ? eq(messageReactions.agentId, actor.id)
            : eq(messageReactions.userId, actor.id)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "Reaction already exists" });
      return;
    }

    const inserted = await db
      .insert(messageReactions)
      .values({
        messageId,
        agentId: actor.kind === "agent" ? actor.id : null,
        userId: actor.kind === "user" ? actor.id : null,
        emoji,
      } as any)
      .returning();

    await logActivity({
      actor,
      companyId: COMPANY_ID,
      action: "reaction.added",
      entityType: "reaction",
      entityId: inserted[0].id,
      details: { messageId, emoji },
    });

    res.status(201).json(inserted[0]);
  } catch (err) {
    console.error("Error adding reaction:", err);
    res.status(500).json({ error: "Failed to add reaction" });
  }
});

/** DELETE /api/messages/:messageId/reactions/:emoji - Remove a reaction */
router.delete(
  "/:messageId/reactions/:emoji",
  async (req: Request, res: Response) => {
    try {
      const actor = req.actor!;
      const messageId = getParam(req, "messageId");
      const rawEmoji = getParam(req, "emoji");
      const emoji = decodeURIComponent(rawEmoji);

      // Verify message exists
      const msgRows = await db
        .select()
        .from(messages)
        .where(and(eq(messages.id, messageId), isNull(messages.deletedAt)))
        .limit(1);

      if (msgRows.length === 0) {
        res.status(404).json({ error: "Message not found" });
        return;
      }

      const deleted = await db
        .delete(messageReactions)
        .where(
          and(
            eq(messageReactions.messageId, messageId),
            eq(messageReactions.emoji, emoji),
            actor.kind === "agent"
              ? eq(messageReactions.agentId, actor.id)
              : eq(messageReactions.userId, actor.id)
          )
        )
        .returning();

      if (deleted.length === 0) {
        res.status(404).json({ error: "Reaction not found" });
        return;
      }

      await logActivity({
        actor,
        companyId: COMPANY_ID,
        action: "reaction.removed",
        entityType: "reaction",
        entityId: messageId,
        details: { emoji },
      });

      res.json({ success: true });
    } catch (err) {
      console.error("Error removing reaction:", err);
      res.status(500).json({ error: "Failed to remove reaction" });
    }
  }
);

/** GET /api/messages/:messageId/reactions - Get all reactions for a message */
router.get("/:messageId/reactions", async (req: Request, res: Response) => {
  try {
    const messageId = getParam(req, "messageId");

    // Verify message exists
    const msgRows = await db
      .select()
      .from(messages)
      .where(and(eq(messages.id, messageId), isNull(messages.deletedAt)))
      .limit(1);

    if (msgRows.length === 0) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    // Group reactions by emoji using raw SQL query
    const results = await db.execute(
      sql`
        SELECT emoji, 
               count(*) as count,
               array_agg(DISTINCT agent_id) as agent_ids,
               array_agg(DISTINCT user_id) as user_ids
        FROM platform_message_reactions
        WHERE message_id = ${messageId}
        GROUP BY emoji
        ORDER BY count DESC
      `
    );

    const reactions = (results as any).rows.map((row: any) => ({
      emoji: row.emoji,
      count: Number(row.count),
      agentIds: row.agent_ids?.filter((x: any) => x !== null) ?? [],
      userIds: row.user_ids?.filter((x: any) => x !== null) ?? [],
    }));

    res.json(reactions);
  } catch (err) {
    console.error("Error fetching reactions:", err);
    res.status(500).json({ error: "Failed to fetch reactions" });
  }
});

export default router;
