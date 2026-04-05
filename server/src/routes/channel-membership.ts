/**
 * Channel Membership Routes
 *
 * Manages membership of agents to channels.
 * Uses the project's own platform_channel_memberships table.
 *
 * GET    /api/memberships/channels/:channelId
 *   List all members of a channel
 *
 * POST   /api/memberships/channels/:channelId
 *   Add an agent to a channel
 *   Body: { agentId: string, role?: "member" | "admin" }
 *
 * DELETE /api/memberships/channels/:channelId/agents/:agentId
 *   Remove an agent from a channel
 *
 * GET    /api/memberships/channels/:channelId/agents/:agentId
 *   Check if a specific agent is a member
 */

import { Router, type Request, type Response } from "express";
import {
  db,
  channels,
  channelMemberships,
  agents,
  type NewChannelMembership,
} from "../db.js";
import { eq, and, isNull, asc } from "drizzle-orm";
import { authenticate, requireCompany } from "../middleware/auth.js";
import { logActivity, paramStr, asyncHandler } from "../utils/helpers.js";
import { COMPANY_ID } from "../config.js";
import { z } from "zod";

const router = Router();

// ── GET /api/memberships/channels/:channelId ──────────────────────────────
router.get("/channels/:channelId", async (req: Request, res: Response) => {
  const channelId = paramStr(req, "channelId");

  try {
    const chanRows = await db
      .select({ id: channels.id, name: channels.name })
      .from(channels)
      .where(and(eq(channels.id, channelId), eq(channels.companyId, COMPANY_ID)))
      .limit(1);

    if (chanRows.length === 0) {
      res.status(404).json({ error: "Channel not found" });
      return;
    }

    const members = await db
      .select({
        id: channelMemberships.id,
        agentId: channelMemberships.agentId,
        agentName: agents.name,
        userId: channelMemberships.userId,
        role: channelMemberships.role,
        joinedAt: channelMemberships.joinedAt,
        leftAt: channelMemberships.leftAt,
      })
      .from(channelMemberships)
      .leftJoin(agents, eq(channelMemberships.agentId, agents.id))
      .where(and(eq(channelMemberships.channelId, channelId), isNull(channelMemberships.leftAt)))
      .orderBy(asc(channelMemberships.joinedAt));

    res.status(200).json({
      channelId,
      channelName: chanRows[0].name,
      members: members.map((m) => ({
        id: m.id,
        agentId: m.agentId,
        agentName: m.agentName ?? undefined,
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
      count: members.length,
    });
  } catch (err) {
    console.error("Error listing channel members:", err);
    res.status(500).json({ error: "Failed to list members" });
  }
});

// ── GET /api/memberships/channels/:channelId/agents/:agentId ──────────────
router.get("/channels/:channelId/agents/:agentId", async (req: Request, res: Response) => {
  const channelId = paramStr(req, "channelId");
  const agentId = paramStr(req, "agentId");

  try {
    const result = await db
      .select({
        id: channelMemberships.id,
        agentId: channelMemberships.agentId,
        agentName: agents.name,
        role: channelMemberships.role,
        joinedAt: channelMemberships.joinedAt,
        leftAt: channelMemberships.leftAt,
      })
      .from(channelMemberships)
      .leftJoin(agents, eq(channelMemberships.agentId, agents.id))
      .where(and(eq(channelMemberships.channelId, channelId), eq(channelMemberships.agentId, agentId)))
      .limit(1);

    if (result.length === 0) {
      res.status(404).json({ error: "Agent is not a member of this channel" });
      return;
    }

    const m = result[0];
    res.status(200).json({
      isMember: true,
      id: m.id,
      agentId: m.agentId,
      agentName: m.agentName ?? "Unknown",
      role: m.role,
      joinedAt: m.joinedAt,
    });
  } catch (err) {
    console.error("Error checking membership:", err);
    res.status(500).json({ error: "Failed to check membership" });
  }
});

// ── POST /api/memberships/channels/:channelId ─────────────────────────────
const addMemberSchema = z.object({
  agentId: z.string().uuid(),
  role: z.enum(["member", "admin"]).optional().default("member"),
});

router.post("/channels/:channelId", async (req: Request, res: Response) => {
  const channelId = paramStr(req, "channelId");
  const actor = req.actor!;

  const parse = addMemberSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(422).json({ error: "Validation failed", details: parse.error.flatten() });
    return;
  }

  const { agentId, role } = parse.data;

  try {
    // Verify channel exists
    const chanRows = await db
      .select({ id: channels.id })
      .from(channels)
      .where(and(eq(channels.id, channelId), eq(channels.companyId, COMPANY_ID)))
      .limit(1);

    if (chanRows.length === 0) {
      res.status(404).json({ error: "Channel not found" });
      return;
    }

    // Check if agent exists
    const agentRows = await db
      .select({ id: agents.id, name: agents.name })
      .from(agents)
      .where(eq(agents.id, agentId))
      .limit(1);

    if (agentRows.length === 0) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }

    // Check if already a member
    const existing = await db
      .select({ id: channelMemberships.id, leftAt: channelMemberships.leftAt })
      .from(channelMemberships)
      .where(and(eq(channelMemberships.channelId, channelId), eq(channelMemberships.agentId, agentId)))
      .limit(1);

    if (existing.length > 0 && existing[0].leftAt === null) {
      res.status(409).json({ error: "Agent is already a member of this channel" });
      return;
    }

    // Either rejoin (update leftAt to null and role) or insert fresh
    if (existing.length > 0 && existing[0].leftAt !== null) {
      await db
        .update(channelMemberships)
        .set({ leftAt: null, role })
        .where(eq(channelMemberships.id, existing[0].id));
    } else {
      const memberData: NewChannelMembership = {
        channelId,
        agentId,
        role,
      };
      await db.insert(channelMemberships).values(memberData);
    }

    await logActivity({
      actor,
      companyId: COMPANY_ID,
      action: "channel_membership.added",
      entityType: "channel_membership",
      entityId: channelId,
      details: { agentId, role },
    });

    res.status(201).json({
      ok: true,
      message: `Agent ${agentId} added to channel ${channelId} as ${role}`,
    });
  } catch (err) {
    console.error("Error adding member:", err);
    res.status(500).json({ error: "Failed to add agent to channel" });
  }
});

// ── DELETE /api/memberships/channels/:channelId/agents/:agentId ───────────
router.delete("/channels/:channelId/agents/:agentId", async (req: Request, res: Response) => {
  const channelId = paramStr(req, "channelId");
  const agentId = paramStr(req, "agentId");
  const actor = req.actor!;

  try {
    const result = await db
      .select({ id: channelMemberships.id })
      .from(channelMemberships)
      .where(and(eq(channelMemberships.channelId, channelId), eq(channelMemberships.agentId, agentId), isNull(channelMemberships.leftAt)))
      .limit(1);

    if (result.length === 0) {
      res.status(404).json({ error: "Membership not found" });
      return;
    }

    await db
      .update(channelMemberships)
      .set({ leftAt: new Date() })
      .where(eq(channelMemberships.id, result[0].id));

    await logActivity({
      actor,
      companyId: COMPANY_ID,
      action: "channel_membership.removed",
      entityType: "channel_membership",
      entityId: channelId,
      details: { agentId },
    });

    res.status(200).json({
      ok: true,
      message: `Agent ${agentId} removed from channel ${channelId}`,
    });
  } catch (err) {
    console.error("Error removing member:", err);
    res.status(500).json({ error: "Failed to remove agent from channel" });
  }
});

export default router;
