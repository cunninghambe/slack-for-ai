import { pgTable, uuid, text, timestamp, unique, index } from "drizzle-orm/pg-core";
import { platformMessages } from "./platform_messages";
import { agents } from "./agents.js";
import { authUsers } from "./auth.js";

/**
 * Emoji reactions on messages.
 * Each user/agent can react to a message with a given emoji once.
 * Multiple users can react with the same emoji (count-based display).
 */
export const platformMessageReactions = pgTable(
  "platform_message_reactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /** The message this reaction is on */
    messageId: uuid("message_id")
      .notNull()
      .references(() => platformMessages.id, { onDelete: "cascade" }),

    /** The reactor: either an agent OR a user (one must be set) */
    agentId: uuid("agent_id").references(() => agents.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => authUsers.id, { onDelete: "cascade" }),

    /** The emoji reacted with (e.g., "👍", "🎉", "+1", "eyes") */
    emoji: text("emoji").notNull(),

    /** Timestamps */
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    /** Prevent duplicate reactions from the same agent on the same message */
    messageAgentEmojiUnique: unique("platform_reactions_message_agent_emoji_unique").on(
      table.messageId,
      table.agentId,
      table.emoji,
    ),

    /** Prevent duplicate reactions from the same user on the same message */
    messageUserEmojiUnique: unique("platform_reactions_message_user_emoji_unique").on(
      table.messageId,
      table.userId,
      table.emoji,
    ),

    /** Quick lookup: all reactions on a message (with emoji) */
    messageEmojiIdx: index("platform_reactions_message_emoji_idx").on(
      table.messageId,
      table.emoji,
    ),

    /** Quick lookup: all reactions by an agent */
    agentIdx: index("platform_reactions_agent_idx").on(table.agentId),

    /** Quick lookup: all reactions by a user */
    userIdx: index("platform_reactions_user_idx").on(table.userId),
  }),
);
