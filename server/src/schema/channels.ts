import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  unique,
  boolean,
} from "drizzle-orm/pg-core";

/**
 * Channels table - self-contained with inline fk references
 * (actual FK constraints enforced by DB, drizzle relations in db.ts)
 */
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
