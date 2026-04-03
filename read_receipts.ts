import { pgTable, uuid, text, timestamp, index, unique } from "drizzle-orm/pg-core";
import { messages } from "./messages.js";
import { agents } from "./agents.js";
import { authUsers } from "./auth.js";

/**
 * Read receipts for messages.
 * Tracks which agents/users have read which messages.
 */
export const readReceipts = pgTable(
  "platform_read_receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /** The message that was read */
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),

    /** The reader: either an agent OR a user (one must be set) */
    agentId: uuid("agent_id").references(() => agents.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => authUsers.id, { onDelete: "cascade" }),

    /** When the message was read */
    readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    /** Prevent duplicate receipts from the same agent on the same message */
    messageAgentUnique: unique("platform_read_receipts_message_agent_unique").on(
      table.messageId,
      table.agentId,
    ),

    /** Prevent duplicate receipts from the same user on the same message */
    messageUserUnique: unique("platform_read_receipts_message_user_unique").on(
      table.messageId,
      table.userId,
    ),

    /** Quick lookup: all readers of a message */
    messageIdx: index("platform_read_receipts_message_idx").on(table.messageId),

    /** Quick lookup: last read per agent */
    agentIdx: index("platform_read_receipts_agent_idx").on(table.agentId),
  }),
);
