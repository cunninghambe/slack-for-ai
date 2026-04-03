import { pgTable, uuid, text, timestamp, index, uniqueIndex, boolean } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { agents } from "./agents.js";
import { authUsers } from "./auth.js";

/**
 * Channels for the Slack-for-AI internal messaging platform.
 * Supports public, private, and direct-message channel types.
 * Scoped per-company to enforce multi-tenant isolation.
 */
export const platformChannels = pgTable(
  "platform_channels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    /** Channel name, unique within a company for public/private channels. DMs use auto-generated slugs. */
    name: text("name").notNull(),
    /** Lowercased, normalized version for lookups */
    slug: text("slug").notNull(),

    /** Channel visibility and access model */
    channelType: text("channel_type").notNull().default("public"), // "public" | "private" | "dm" | "group_dm"

    /** Human-readable description of the channel's purpose */
    description: text("description"),

    /** Whether the channel is archived (true = archived) */
    archived: boolean("archived").notNull().default(false),
    archivedAt: timestamp("archived_at", { withTimezone: true }),

    /** For DM/group_dm: the user who initiated the conversation */
    creatorAgentId: uuid("creator_agent_id").references(() => agents.id, { onDelete: "set null" }),
    creatorUserId: text("creator_user_id").references(() => authUsers.id, { onDelete: "set null" }),

    /** Timestamps */
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    companySlugUniqueIdx: uniqueIndex("platform_channels_company_slug_unique").on(
      table.companyId,
      table.slug,
    ),
    companyArchivedIdx: index("platform_channels_company_archived_idx").on(
      table.companyId,
      table.archived,
    ),
    companyTypeIdx: index("platform_channels_company_type_idx").on(
      table.companyId,
      table.channelType,
    ),
    deletedAtIdx: index("platform_channels_deleted_at_idx").on(table.deletedAt),
  }),
);
