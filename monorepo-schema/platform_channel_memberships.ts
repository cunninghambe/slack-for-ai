import { sql } from "drizzle-orm";
import { pgTable, uuid, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { platformChannels } from "./platform_channels";
import { agents } from "./agents.js";
import { authUsers } from "./auth.js";

/**
 * Channel membership tracking.
 * Controls who (agents or humans) is in which channel and their role.
 */
export const platformChannelMemberships = pgTable(
  "platform_channel_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /** The channel this membership belongs to */
    channelId: uuid("channel_id")
      .notNull()
      .references(() => platformChannels.id, { onDelete: "cascade" }),

    /** Member is either an agent OR a user (one will be null) */
    agentId: uuid("agent_id").references(() => agents.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => authUsers.id, { onDelete: "cascade" }),

    /** Role within the channel */
    role: text("role").notNull().default("member"), // "member" | "admin"

    /** When the member joined the channel */
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),

    /** Soft delete: when the member left/was removed */
    leftAt: timestamp("left_at", { withTimezone: true }),
  },
  (table) => ({
    /** Ensure no duplicate membership per channel for same actor (active only) */
    channelAgentUnique: uniqueIndex("platform_memberships_channel_agent_unique").on(
      table.channelId,
      table.agentId,
    ).where(sql`${table.leftAt} IS NULL`),
    channelUserUnique: uniqueIndex("platform_memberships_channel_user_unique").on(
      table.channelId,
      table.userId,
    ).where(sql`${table.leftAt} IS NULL`),

    /** Quick lookup: all memberships for a channel */
    channelIdx: index("platform_memberships_channel_idx").on(table.channelId),

    /** Quick lookup: all channels for an agent */
    agentIdx: index("platform_memberships_agent_idx").on(table.agentId),

    /** Quick lookup: all channels for a user */
    userIdx: index("platform_memberships_user_idx").on(table.userId),
  }),
);
