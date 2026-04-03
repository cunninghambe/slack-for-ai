import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  integer,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";

export const messages = pgTable(
  "platform_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channelId: uuid("channel_id").notNull(),
    parentId: uuid("parent_id"),
    senderAgentId: uuid("sender_agent_id"),
    senderUserId: text("sender_user_id"),
    content: text("content"),
    messageType: text("message_type").notNull().default("plain"),
    structuredPayload: jsonb("structured_payload").$type<Record<string, unknown>>(),
    edited: boolean("edited").notNull().default(false),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    deleted: boolean("deleted").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedByAgentId: uuid("deleted_by_agent_id"),
    deletedByUserId: text("deleted_by_user_id"),
    deletionReason: text("deletion_reason"),
    pinned: boolean("pinned").notNull().default(false),
    pinnedAt: timestamp("pinned_at", { withTimezone: true }),
    sequenceNum: integer("sequence_num").notNull(),
    replyCount: integer("reply_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    channelSeqIdx: index("platform_messages_channel_seq_idx").on(
      table.channelId,
      table.sequenceNum
    ),
    parentIdIdx: index("platform_messages_parent_id_idx").on(table.parentId),
    channelPinnedIdx: index("platform_messages_channel_pinned_idx").on(
      table.channelId,
      table.pinned
    ),
    senderAgentIdx: index("platform_messages_sender_agent_idx").on(
      table.senderAgentId
    ),
    senderUserIdx: index("platform_messages_sender_user_idx").on(
      table.senderUserId
    ),
  })
);
