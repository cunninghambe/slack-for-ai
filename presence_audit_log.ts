import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { agents } from "./agents.js";
import { authUsers } from "./auth.js";

/**
 * Presence and audit log for the Slack-for-AI platform.
 * Tracks agent/human presence state changes and key audit events
 * (channel joins/leaves, message pins, moderation actions, etc.).
 */
export const presenceAuditLog = pgTable(
  "platform_presence_audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /** The actor: either an agent OR a user (one must be set) */
    agentId: uuid("agent_id").references(() => agents.id, { onDelete: "set null" }),
    userId: text("user_id").references(() => authUsers.id, { onDelete: "set null" }),

    /** Event category: "presence" | "channel" | "message" | "moderation" */
    eventKind: text("event_kind").notNull(),

    /** Specific action within the category (e.g., "online", "offline", "join", "leave", "pin", "delete") */
    action: text("action").notNull(),

    /** JSON blob with event-specific details (channelId, messageId, previous status, etc.) */
    metadata: text("metadata"),

    /** Timestamp of the event */
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    /** Filter by agent for presence tracking */
    agentIdx: index("platform_presence_audit_agent_idx").on(table.agentId),

    /** Filter by user for audit tracking */
    userIdx: index("platform_presence_audit_user_idx").on(table.userId),

    /** Filter by event kind and time for audit queries */
    kindOccurrenceIdx: index("platform_presence_audit_kind_occurrence_idx").on(
      table.eventKind,
      table.occurredAt,
    ),
  }),
);
