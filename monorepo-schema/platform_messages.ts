import { pgTable, uuid, text, timestamp, index, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { platformChannels } from "./platform_channels";
import { agents } from "./agents.js";
import { authUsers } from "./auth.js";

/**
 * Messages for the Slack-for-AI internal messaging platform.
 * Supports threaded conversations (parent_id), structured/agent-friendly formats,
 * and both agent and human senders.
 */
export const platformMessages = pgTable(
  "platform_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /** The channel this message belongs to */
    channelId: uuid("channel_id")
      .notNull()
      .references(() => platformChannels.id, { onDelete: "cascade" }),

    /** Parent message ID for threading (null = top-level message) */
    parentId: uuid("parent_id"),

    /** Sender is either an agent OR a user (one will be null) */
    senderAgentId: uuid("sender_agent_id").references(() => agents.id, { onDelete: "set null" }),
    senderUserId: text("sender_user_id").references(() => authUsers.id, { onDelete: "set null" }),

    /**
     * Message payload.
     * For plain text: the markdown/text content of the message.
     * For structured: JSON payload that agents can parse and act upon.
     */
    content: text("content"),

    /** How to interpret the content */
    messageType: text("message_type").notNull().default("plain"), // "plain" | "structured" | "system"

    /** Structured message payload for agent-to-agent communication (MCP-compatible formats) */
    structuredPayload: jsonb("structured_payload").$type<Record<string, unknown>>(),

    /** Whether this message has been edited */
    edited: boolean("edited").notNull().default(false),
    editedAt: timestamp("edited_at", { withTimezone: true }),

    /** Whether this message has been deleted (soft delete for audit trail) */
    deleted: boolean("deleted").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedByAgentId: uuid("deleted_by_agent_id").references(() => agents.id, { onDelete: "set null" }),
    deletedByUserId: text("deleted_by_user_id").references(() => authUsers.id, { onDelete: "set null" }),

    /** Deletion reason / moderation note */
    deletionReason: text("deletion_reason"),

    /** Whether this message is pinned to the channel */
    pinned: boolean("pinned").notNull().default(false),
    pinnedAt: timestamp("pinned_at", { withTimezone: true }),

    /** Auto-incrementing sequence number for ordering within a channel/thread */
    sequenceNum: integer("sequence_num").notNull(),

    /** Reply count for this message (for threads where this is the parent) */
    replyCount: integer("reply_count").notNull().default(0),

    /** Timestamps */
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    /** Messages in a channel, ordered for display */
    channelSeqIdx: index("platform_messages_channel_seq_idx").on(
      table.channelId,
      table.sequenceNum,
    ),

    /** Thread replies: find all replies to a parent message */
    parentIdIdx: index("platform_messages_parent_id_idx").on(table.parentId),

    /** Pinned messages query */
    channelPinnedIdx: index("platform_messages_channel_pinned_idx").on(
      table.channelId,
      table.pinned,
    ),

    /** Messages by agent for activity tracking */
    senderAgentIdx: index("platform_messages_sender_agent_idx").on(table.senderAgentId),

    /** Messages by user for activity tracking */
    senderUserIdx: index("platform_messages_sender_user_idx").on(table.senderUserId),
  }),
);
