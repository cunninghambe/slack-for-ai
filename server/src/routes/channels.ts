import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  db,
  channels,
  channelMemberships,
  agents,
} from "../db.js";
import { eq, and, isNull, asc } from "drizzle-orm";
import { authenticate, requireCompany } from "../middleware/auth.js";
import { logActivity } from "../utils/helpers.js";

const router = Router();
const COMPANY_ID = "91d80478-1fd3-4025-8ec1-5bf3aed65665";

// Utility: safe param extraction
function paramId(req: Request, key: string): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] : val;
}

// Validation schemas
const createChannelSchema = z.object({
  name: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  channelType: z.enum(["public", "private", "dm", "group_dm"]).default("public"),
  memberAgentIds: z.array(z.string().uuid()).optional(),
  memberUserIds: z.array(z.string()).optional(),
});

const updateChannelSchema = z.object({
  name: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(500).optional(),
  channelType: z.enum(["public", "private", "dm", "group_dm"]).optional(),
  archived: z.boolean().optional(),
});

// Apply auth middleware
router.use(authenticate);
router.use(requireCompany(COMPANY_ID));

// GET /api/channels - List accessible channels
router.get("/", async (_req: Request, res: Response) => {
  try {
    const results = await db
      .select({
        id: channels.id,
        name: channels.name,
        slug: channels.slug,
        channelType: channels.channelType,
        description: channels.description,
        archived: channels.archived,
        createdAt: channels.createdAt,
        updatedAt: channels.updatedAt,
      })
      .from(channels)
      .where(
        and(
          eq(channels.companyId, COMPANY_ID),
          isNull(channels.deletedAt),
          eq(channels.archived, false)
        )
      )
      .orderBy(asc(channels.name));

    res.json(results);
  } catch (err) {
    console.error("Error listing channels:", err);
    res.status(500).json({ error: "Failed to list channels" });
  }
});

// GET /api/channels/:id - Get channel details
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = paramId(req, "id");
    
    const rows = await db
      .select()
      .from(channels)
      .where(
        and(
          eq(channels.id, id),
          eq(channels.companyId, COMPANY_ID),
          isNull(channels.deletedAt)
        )
      )
      .limit(1);

    if (rows.length === 0) {
      res.status(404).json({ error: "Channel not found" });
      return;
    }

    const channel = rows[0];

    // Get memberships
    const memberships = await db
      .select({
        role: channelMemberships.role,
        joinedAt: channelMemberships.joinedAt,
        leftAt: channelMemberships.leftAt,
      })
      .from(channelMemberships)
      .where(eq(channelMemberships.channelId, channel.id));

    res.json({ ...channel, memberships });
  } catch (err) {
    console.error("Error fetching channel:", err);
    res.status(500).json({ error: "Failed to fetch channel" });
  }
});

// POST /api/channels - Create a channel
router.post("/", async (req: Request, res: Response) => {
  try {
    const actor = req.actor!;
    const validation = createChannelSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(422).json({
        error: "Validation failed",
        details: validation.error.flatten(),
      });
      return;
    }

    const { name, description, channelType, memberAgentIds, memberUserIds } =
      validation.data;
    const slug = name.toLowerCase();

    const inserted = await db
      .insert(channels)
      .values({
        companyId: COMPANY_ID,
        name,
        slug,
        channelType,
        description: description ?? null,
        creatorAgentId: actor.kind === "agent" ? actor.id : null,
        creatorUserId: actor.kind === "user" ? actor.id : null,
      } as any)
      .returning();

    const newChannel = inserted[0];

    // Add creator as admin
    await db.insert(channelMemberships).values({
      channelId: newChannel.id,
      agentId: actor.kind === "agent" ? actor.id : null,
      userId: actor.kind === "user" ? actor.id : null,
      role: "admin",
    } as any);

    // Add specified members for private channels
    if (channelType === "private" || channelType === "group_dm") {
      const membershipInserts = [];

      if (memberAgentIds) {
        for (const agentId of memberAgentIds) {
          membershipInserts.push({
            channelId: newChannel.id,
            agentId,
            role: "member" as const,
          } as any);
        }
      }

      if (memberUserIds) {
        for (const userId of memberUserIds) {
          membershipInserts.push({
            channelId: newChannel.id,
            userId,
            role: "member" as const,
          } as any);
        }
      }

      if (membershipInserts.length > 0) {
        await db.insert(channelMemberships).values(membershipInserts);
      }
    }

    await logActivity({
      actor,
      companyId: COMPANY_ID,
      action: "channel.created",
      entityType: "channel",
      entityId: newChannel.id,
      details: { name, channelType },
    });

    res.status(201).json(newChannel);
  } catch (err) {
    console.error("Error creating channel:", err);
    res.status(500).json({ error: "Failed to create channel" });
  }
});

// PATCH /api/channels/:id - Update channel
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const actor = req.actor!;
    const id = paramId(req, "id");

    const validation = updateChannelSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(422).json({
        error: "Validation failed",
        details: validation.error.flatten(),
      });
      return;
    }

    const existing = await db
      .select()
      .from(channels)
      .where(
        and(
          eq(channels.id, id),
          eq(channels.companyId, COMPANY_ID),
          isNull(channels.deletedAt)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      res.status(404).json({ error: "Channel not found" });
      return;
    }

    const updateData: {
      name?: string;
      slug?: string;
      description?: string;
      channelType?: string;
      archived?: boolean;
    } = {};
    
    if (validation.data.name !== undefined) {
      updateData.name = validation.data.name;
      updateData.slug = validation.data.name.toLowerCase();
    }
    if (validation.data.description !== undefined) {
      updateData.description = validation.data.description;
    }
    if (validation.data.channelType !== undefined) {
      updateData.channelType = validation.data.channelType;
    }
    if (validation.data.archived !== undefined) {
      updateData.archived = validation.data.archived;
    }

    const updated = await db
      .update(channels)
      .set(updateData)
      .where(eq(channels.id, id))
      .returning();

    await logActivity({
      actor,
      companyId: COMPANY_ID,
      action: "channel.updated",
      entityType: "channel",
      entityId: id,
      details: validation.data,
    });

    res.json(updated[0]);
  } catch (err) {
    console.error("Error updating channel:", err);
    res.status(500).json({ error: "Failed to update channel" });
  }
});

export default router;
