/**
 * Database connection and all schema definitions.
 * Uses the same PostgreSQL as Paperclip.
 */
import { Pool, PoolClient } from "pg";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { logger } from "./utils/logger.js";
import {
  pgTable,
  text,
  uuid,
  timestamp,
  jsonb,
  boolean,
  integer,
  bigint,
  index,
  unique,
} from "drizzle-orm/pg-core";

// ============================================================
// Platform tables (shared with Paperclip main app)
// ============================================================

export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  keyName: text("key_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const agentApiKeys=pgTable("agent_api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  keyHash: text("key_hash").notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  pendingKeyHash: text("pending_key_hash"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const authUsers=pgTable("auth_users", {
  id: text("id").primaryKey(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// File attachments table
export const fileAttachments = pgTable(
  "platform_file_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channelId: uuid("channel_id").notNull(),
    messageId: uuid("message_id"),
    filename: text("filename").notNull(),
    storedName: text("stored_name").notNull(),
    mimeType: text("mime_type"),
    sizeBytes: integer("size_bytes").notNull(),
    extension: text("extension"),
    uploadedByAgentId: uuid("uploaded_by_agent_id"),
    uploadedByUserId: text("uploaded_by_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("file_attachments_channel_idx").on(table.channelId),
    index("file_attachments_message_idx").on(table.messageId),
    index("file_attachments_created_idx").on(table.createdAt),
  ]
);

export const activityLog = pgTable("activity_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull(),
  actorType: text("actor_type").notNull().default("system"),
  actorId: text("actor_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull().default(""),
  details: jsonb("details"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ============================================================
// Slack-for-AI platform schemas
// ============================================================

export const channels = pgTable(
  "platform_channels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    channelType: text("channel_type").notNull().default("public"),
    description: text("description"),
    archived: boolean("archived").notNull().default(false),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    creatorAgentId: uuid("creator_agent_id"),
    creatorUserId: text("creator_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    companySlugUniqueIdx: unique("platform_channels_company_slug_unique").on(
      table.companyId,
      table.slug
    ),
    companyArchivedIdx: index("platform_channels_company_archived_idx").on(
      table.companyId,
      table.archived
    ),
    companyTypeIdx: index("platform_channels_company_type_idx").on(
      table.companyId,
      table.channelType
    ),
  })
);

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
    // Unique constraints removed — overly strict (prevented rejoin after leave).
    // Application layer enforces one active membership per user/agent per channel
    // by checking `WHERE leftAt IS NULL` before inserting.
  })
);

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

// ============================================================
// Read receipts
// ============================================================

export const readReceipts = pgTable(
  "platform_read_receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id").references(() => agents.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => authUsers.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    messageAgentUnique: unique("platform_read_receipts_message_agent_unique").on(
      table.messageId,
      table.agentId,
    ),
    messageUserUnique: unique("platform_read_receipts_message_user_unique").on(
      table.messageId,
      table.userId,
    ),
    messageIdx: index("platform_read_receipts_message_idx").on(table.messageId),
    agentIdx: index("platform_read_receipts_agent_idx").on(table.agentId),
  }),
);

// ============================================================
// Presence and audit log
// ============================================================

export const presenceAuditLog = pgTable(
  "platform_presence_audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id").references(() => agents.id, { onDelete: "set null" }),
    userId: text("user_id").references(() => authUsers.id, { onDelete: "set null" }),
    eventKind: text("event_kind").notNull(),
    action: text("action").notNull(),
    metadata: text("metadata"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    agentIdx: index("platform_presence_audit_agent_idx").on(table.agentId),
    userIdx: index("platform_presence_audit_user_idx").on(table.userId),
    kindOccurrenceIdx: index("platform_presence_audit_kind_occurrence_idx").on(
      table.eventKind,
      table.occurredAt,
    ),
  }),
);

// ============================================================
// Slow query detection
// ============================================================

export const SLOW_QUERY_THRESHOLD_MS = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || "250", 10);

// Query timing stats
export const dbStats = {
  totalQueries: 0,
  slowQueries: 0,
  connectionErrors: 0,
  lastSlowQuery: null as { text: string; durationMs: number; timestamp: string } | null,
};

function trackQuery(duration: number, text: string): void {
  dbStats.totalQueries++;
  if (duration > SLOW_QUERY_THRESHOLD_MS) {
    dbStats.slowQueries++;
    dbStats.lastSlowQuery = { text, durationMs: duration, timestamp: new Date().toISOString() };
    logger.warn("Slow query detected", { durationMs: duration, query: text });
  }
}

function extractQueryText(args: unknown[]): string {
  if (typeof args[0] === "string") return args[0];
  if (typeof args[0] === "object" && args[0] !== null) return (args[0] as { text?: string }).text ?? "unknown";
  return "unknown";
}

/**
 * Wrap a pg Pool to detect slow queries.
 * Intercepts pool.connect() and pool.query() to track execution time.
 */
function wrapPoolForSlowQueries(targetPool: Pool): Pool {
  // Intercept pool.query()
  const originalQuery = targetPool.query.bind(targetPool);
  (targetPool.query as typeof originalQuery) = async function interceptedQuery(
    ...args: Parameters<typeof originalQuery>
  ) {
    const start = Date.now();
    try {
      const result = await originalQuery(...args);
      trackQuery(Date.now() - start, extractQueryText(args));
      return result;
    } catch (err) {
      logger.error("Query failed", { durationMs: Date.now() - start, error: String(err) });
      throw err;
    }
  };

  // Intercept pool.connect() to wrap client.query too
  const originalConnect = targetPool.connect.bind(targetPool);
  targetPool.connect = async function interceptedConnect(): Promise<PoolClient> {
    try {
      const client = await originalConnect();
      const clientOriginalQuery = client.query.bind(client);
      client.query = async (...cArgs: Parameters<typeof clientOriginalQuery>) => {
        const start = Date.now();
        try {
          const result = await clientOriginalQuery(...cArgs);
          trackQuery(Date.now() - start, extractQueryText(cArgs));
          return result;
        } catch (err) {
          logger.error("Client query failed", { durationMs: Date.now() - start, error: String(err) });
          throw err;
        }
      };
      return client;
    } catch (err) {
      dbStats.connectionErrors++;
      logger.error("Failed to acquire DB connection", { error: String(err) });
      throw err;
    }
  };

  return targetPool;
}

// ============================================================
// Full schema object for typed db
// ============================================================

// ============================================================
// Insert model types (avoids `as any` on .values() / .set())
// ============================================================

export type NewChannel = typeof channels.$inferInsert;
export type NewChannelMembership = typeof channelMemberships.$inferInsert;
export type NewMessage = typeof messages.$inferInsert;
export type NewReaction = typeof messageReactions.$inferInsert;
export type NewActivityLog = typeof activityLog.$inferInsert;
export type NewFileAttachment = typeof fileAttachments.$inferInsert;
export type NewReadReceipt = typeof readReceipts.$inferInsert;

export const schema = {
  companies,
  agents,
  agentApiKeys,
  authUsers,
  activityLog,
  channels,
  channelMemberships,
  messages,
  messageReactions,
  fileAttachments,
  readReceipts,
  presenceAuditLog,
};

export type Database = NodePgDatabase<typeof schema>;

// ============================================================
// Connection pool (wrapped for slow query detection)
// ============================================================

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://paperclip:***@localhost:5432/paperclip";

export const pool = wrapPoolForSlowQueries(new Pool({
  connectionString: databaseUrl,
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
}));

export const db = drizzle(pool, { schema }) as Database;
