import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";

export const channelMemberships = pgTable(
  "platform_channel_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channelId: uuid("channel_id").notNull(),
    agentId: uuid("agent_id"),
    userId: text("user_id"),
    role: text("role").notNull().default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    leftAt: timestamp("left_at", { withTimezone: true }),
  },
  (table) => ({
    channelIdx: index("platform_memberships_channel_idx").on(table.channelId),
    agentIdx: index("platform_memberships_agent_idx").on(table.agentId),
    userIdx: index("platform_memberships_user_idx").on(table.userId),
    channelAgentUnique: unique(
      "platform_memberships_channel_agent_unique"
    ).on(table.channelId, table.agentId),
    channelUserUnique: unique("platform_memberships_channel_user_unique").on(
      table.channelId,
      table.userId
    ),
  })
);
