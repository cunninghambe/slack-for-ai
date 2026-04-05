/**
 * Company-Scoped Channel Membership Routes
 *
 * Endpoints:
 *   POST   /api/companies/:companyId/channels/:channelId/members      - Add agent to channel
 *   DELETE /api/companies/:companyId/channels/:channelId/members/:agentId - Remove agent from channel
 *   GET    /api/companies/:companyId/channels/:channelId/members      - List all members
 *
 * These routes extract companyId from the URL path and validate that the channel
 * belongs to the specified company.
 */
import { Router, Request, Response } from "express";
import { z } from "zod";
import { db, channels, channelMemberships, agents as agentsTable, authUsers, type NewChannelMembership } from "../db.js";
import { eq, and, isNull } from "drizzle-orm";
import { authenticate } from "../middleware/auth.js";
import { logActivity } from "../utils/helpers.js";

const router = Router();

// Utility: safe param extraction (Express params can be string | string[])
function paramId(req: Request, key: string): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] : val;
}

// Apply auth middleware
router.use(authenticate);

// Validation schemas
const addMemberSchema = z.object({
  agentId: z.string().uuid().optional(),
  userId: z.string().optional(),
  role: z.enum(["admin", "member"]).default("member"),
});

// Helper: verify channel exists and belongs to the given company
async function findChannelForCompany(channelId: string, companyId: string) {
  const rows = await db
    .select()
    .from(channels)
    .where(
      and(
        eq(channels.id, channelId),
        eq(channels.companyId, companyId),
        isNull(channels.deletedAt)
      )
    )
    .limit(1);
  return rows.length > 0 ? rows[0] : null;
}

// Helper: check if actor is a channel admin
async function isChannelAdmin(channelId: string, actor: { kind: string; id: string }) {
  const membership = await db.query.channelMemberships.findFirst({
    where: and(
      eq(channelMemberships.channelId, channelId),
      actor.kind === "agent"
        ? eq(channelMemberships.agentId, actor.id)
        : eq(channelMemberships.userId, actor.id),
      isNull(channelMemberships.leftAt)
    ),
  });
  return membership?.role === "admin";
}

// ============================================================
// GET /api/companies/:companyId/channels/:channelId/members
// List all current members of a channel
// ============================================================
router.get("/:channelId/members", async (req: Request, res: Response) => {
  try {
    const companyId = paramId(req, "companyId");
    const channelId = paramId(req, "channelId");

    const channel = await findChannelForCompany(channelId, companyId);
    if (!channel) {
      res.status(404).json({ error: "Channel not found" });
      return;
    }

    const memberships = await db
      .select({
        id: channelMemberships.id,
        channelId: channelMemberships.channelId,
        role: channelMemberships.role,
        joinedAt: channelMemberships.joinedAt,
        leftAt: channelMemberships.leftAt,
        agentId: channelMemberships.agentId,
        userId: channelMemberships.userId,
        agentName: agentsTable.name,
        userName: authUsers.name,
        agentKeyName: agentsTable.keyName,
      })
      .from(channelMemberships)
      .where(
        and(
          eq(channelMemberships.channelId, channelId),
          isNull(channelMemberships.leftAt)
        )
      )
      .leftJoin(agentsTable, eq(channelMemberships.agentId, agentsTable.id))
      .leftJoin(authUsers, eq(channelMemberships.userId, authUsers.id));

    const members = memberships.map((m) => ({
      id: m.id,
      channelId: m.channelId,
      role: m.role,
      joinedAt: m.joinedAt,
      kind: m.agentId ? "agent" : "user",
      agentId: m.agentId,
      userId: m.userId,
      name: m.agentName ?? m.userName ?? "Unknown",
      keyName: m.agentKeyName ?? null,
    }));

    res.json({ members, count: members.length });
  } catch (err) {
    console.error("Error listing channel members:", err);
    res.status(500).json({ error: "Failed to list channel members" });
  }
});

// ============================================================
// POST /api/companies/:companyId/channels/:channelId/members
// Add a member (agent or user) to a channel
// ============================================================
router.post("/:channelId/members", async (req: Request, res: Response) => {
  try {
    const actor = req.actor!;
    const companyId = paramId(req, "companyId");
    const channelId = paramId(req, "channelId");

    const channel = await findChannelForCompany(channelId, companyId);
    if (!channel) {
      res.status(404).json({ error: "Channel not found" });
      return;
    }

    // Require admin to add members
    const isAdmin = await isChannelAdmin(channelId, actor);
    if (!isAdmin) {
      res.status(403).json({ error: "Only channel admins can add members" });
      return;
    }

    const validation = addMemberSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(422).json({
        error: "Validation failed",
        details: validation.error.flatten(),
      });
      return;
    }

    const { agentId, userId, role } = validation.data;

    if (!agentId && !userId) {
      res.status(422).json({ error: "Must provide agentId or userId" });
      return;
    }

    // Check if already a member
    let existingClause;
    if (agentId) {
      existingClause = and(
        eq(channelMemberships.channelId, channelId),
        eq(channelMemberships.agentId, agentId),
        isNull(channelMemberships.leftAt)
      );
    } else {
      existingClause = and(
        eq(channelMemberships.channelId, channelId),
        eq(channelMemberships.userId, userId!),
        isNull(channelMemberships.leftAt)
      );
    }

    const existing = await db.query.channelMemberships.findFirst({
      where: existingClause,
    });

    if (existing) {
      res.status(409).json({ error: "Already a member of this channel" });
      return;
    }

    const memberData: NewChannelMembership = {
      channelId,
      agentId: agentId ?? null,
      userId: userId ?? null,
      role,
    };
    const [inserted] = await db
      .insert(channelMemberships)
      .values(memberData)
      .returning();

    const addedKind = agentId ? "agent" : "user";
    const addedId = agentId ?? userId!;

    await logActivity({
      actor,
      companyId,
      action: "channel.members.added",
      entityType: "channel",
      entityId: channelId,
      details: { added: [{ kind: addedKind, id: addedId }], role },
    });

    res.status(201).json({ success: true, membership: inserted });
  } catch (err) {
    console.error("Error adding member:", err);
    res.status(500).json({ error: "Failed to add member" });
  }
});

// ============================================================
// DELETE /api/companies/:companyId/channels/:channelId/members/:agentId
// Remove an agent from a channel
// ============================================================
router.delete("/:channelId/members/:agentId", async (req: Request, res: Response) => {
  try {
    const actor = req.actor!;
    const companyId = paramId(req, "companyId");
    const channelId = paramId(req, "channelId");
    const agentId = paramId(req, "agentId");

    const channel = await findChannelForCompany(channelId, companyId);
    if (!channel) {
      res.status(404).json({ error: "Channel not found" });
      return;
    }

    // Require admin to remove others (admins can also remove themselves)
    const isAdmin = await isChannelAdmin(channelId, actor);
    if (!isAdmin) {
      res.status(403).json({ error: "Only channel admins can remove members" });
      return;
    }

    // Find the agent's membership
    const membership = await db.query.channelMemberships.findFirst({
      where: and(
        eq(channelMemberships.channelId, channelId),
        eq(channelMemberships.agentId, agentId),
        isNull(channelMemberships.leftAt)
      ),
    });

    if (!membership) {
      res.status(404).json({ error: "Agent is not a member of this channel" });
      return;
    }

    // Soft-delete by setting leftAt
    await db
      .update(channelMemberships)
      .set({ leftAt: new Date() })
      .where(eq(channelMemberships.id, membership.id));

    await logActivity({
      actor,
      companyId,
      action: "channel.member.removed",
      entityType: "channel",
      entityId: channelId,
      details: { agentId, removedBy: actor.id },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Error removing member:", err);
    res.status(500).json({ error: "Failed to remove member" });
  }
});

export default router;
