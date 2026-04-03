import { pgTable, uuid, text, timestamp, bigint, index, unique } from "drizzle-orm/pg-core";
import { messages } from "./messages.js";
import { agents } from "./agents.js";
import { authUsers } from "./auth.js";

/**
 * File attachments for messages.
 * Tracks uploaded files including their metadata, storage location, and association
 * with the message they were attached to.
 */
export const fileAttachments = pgTable(
  "platform_file_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /** The message this file is attached to */
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),

    /** The uploader: either an agent OR a user (one must be set) */
    uploaderAgentId: uuid("uploader_agent_id").references(() => agents.id, { onDelete: "set null" }),
    uploaderUserId: text("uploader_user_id").references(() => authUsers.id, { onDelete: "set null" }),

    /** Original filename as uploaded */
    originalName: text("original_name").notNull(),

    /** Storage location/path for the file (S3 key, local path, etc.) */
    storagePath: text("storage_path").notNull(),

    /** MIME content type (e.g., "image/png", "application/pdf") */
    contentType: text("content_type").notNull(),

    /** File size in bytes */
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),

    /** Image/asset dimensions (for previews) */
    width: bigint("width", { mode: "number" }),
    height: bigint("height", { mode: "number" }),

    /** Thumbnail path for preview generation */
    thumbnailPath: text("thumbnail_path"),

    /** Public or signed URL for accessing the file (optional, generated on demand) */
    accessUrl: text("access_url"),

    /** Timestamps */
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    /** Quick lookup: all files attached to a message */
    messageIdx: index("platform_file_attachments_message_idx").on(table.messageId),

    /** Quick lookup: all files uploaded by an agent */
    uploaderAgentIdx: index("platform_file_attachments_uploader_agent_idx").on(table.uploaderAgentId),

    /** Quick lookup: all files uploaded by a user */
    uploaderUserIdx: index("platform_file_attachments_uploader_user_idx").on(table.uploaderUserId),

    /** Index by content type for filtering (e.g., show only images) */
    contentTypeIdx: index("platform_file_attachments_content_type_idx").on(table.contentType),
  }),
);
