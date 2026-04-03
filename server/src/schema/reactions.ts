import {
  pgTable,
  uuid,
  text,
  timestamp,
  unique,
  index,
} from "drizzle-orm/pg-core";

export const messageReactions = pgTable(
  "platform_message_reactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messageId: uuid("message_id").notNull(),
    agentId: uuid("agent_id"),
    userId: text("user_id"),
    emoji: text("emoji").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    messageAgentEmojiUnique: unique(
      "platform_reactions_message_agent_emoji_unique"
    ).on(table.messageId, table.agentId, table.emoji),
    messageUserEmojiUnique: unique(
      "platform_reactions_message_user_emoji_unique"
    ).on(table.messageId, table.userId, table.emoji),
    messageEmojiIdx: index("platform_reactions_message_emoji_idx").on(
      table.messageId,
      table.emoji
    ),
    agentIdx: index("platform_reactions_agent_idx").on(table.agentId),
    userIdx: index("platform_reactions_user_idx").on(table.userId),
  })
);
