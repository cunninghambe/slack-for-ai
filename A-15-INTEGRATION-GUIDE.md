# A-15: Database Schema Integration Guide
## Platform Messaging Schema for Slack-for-AI

## Overview
This document describes how to integrate the 7 Drizzle ORM schema tables into the Paperclip monorepo's `packages/db/src/schema/` directory.

## Tables Designed

| Table | Purpose | Table Name (DB) |
|-------|---------|-----------------|
| `platformChannels` | Channel definitions (public/private/dm/group_dm) | `platform_channels` |
| `platformMessages` | Messages with threading, structured payloads, soft deletes | `platform_messages` |
| `platformChannelMemberships` | Who is in which channel with what role | `platform_channel_memberships` |
| `platformMessageReactions` | Emoji reactions on messages | `platform_message_reactions` |
| `platformFileAttachments` | File upload metadata linked to messages | `platform_file_attachments` |
| `platformReadReceipts` | Track who read what | `platform_read_receipts` |
| `platformPresenceAuditLog` | Presence changes and audit trail events | `platform_presence_audit_log` |

## Integration Steps

### 1. Move schema files to monorepo
Copy all files from `monorepo-schema/` into `packages/db/src/schema/`:

```
cp monorepo-schema/platform_channels.ts       packages/db/src/schema/
cp monorepo-schema/platform_messages.ts        packages/db/src/schema/
cp monorepo-schema/platform_channel_memberships.ts  packages/db/src/schema/
cp monorepo-schema/platform_message_reactions.ts    packages/db/src/schema/
cp monorepo-schema/platform_file_attachments.ts     packages/db/src/schema/
cp monorepo-schema/platform_read_receipts.ts        packages/db/src/schema/
cp monorepo-schema/platform_presence_audit_log.ts   packages/db/src/schema/
cp monorepo-schema/index.ts                    packages/db/src/schema/platform_index.ts
```

### 2. Fix self-referencing FK imports
The schema files use relative imports to `platform_channels`, `platform_messages`, `agents.js`, and `auth.js`.
These reference existing tables in the monorepo schema directory, so no import changes needed when files are colocated.

### 3. Add exports to packages/db/src/schema/index.ts

```typescript
export { platformChannels } from "./platform_channels.js";
export { platformMessages } from "./platform_messages.js";
export { platformChannelMemberships } from "./platform_channel_memberships.js";
export { platformMessageReactions } from "./platform_message_reactions.js";
export { platformFileAttachments } from "./platform_file_attachments.js";
export { platformReadReceipts } from "./platform_read_receipts.js";
export { platformPresenceAuditLog } from "./platform_presence_audit_log.js";
```

### 4. Generate migration

```
pnpm db:generate
```

Note: The `platform_channel_memberships` table uses `uniqueIndex().where()` partial
indexes which may need raw SQL in the migration. Drizzle generates these but verify
the migration output for correct WHERE clauses.

### 5. Add self-referencing FK for message parent_id

The `platform_messages.parent_id` self-reference FK is not fully expressible in
Drizzle with `onDelete` behavior. Add this raw SQL in a migration:

```sql
ALTER TABLE platform_messages
  ADD CONSTRAINT platform_messages_parent_id_fkey
  FOREIGN KEY (parent_id) REFERENCES platform_messages(id)
  ON DELETE SET NULL;
CREATE INDEX platform_messages_parent_id_idx ON platform_messages(parent_id);
```

## Key Design Decisions

1. **Polymorphic Actors**: All user-referencing columns support both agents (UUID FK) and humans (text FK to auth_users). Exactly one is set per row.

2. **Company Scoping**: Channels are scoped to `company_id` for multi-tenant isolation. All channel visibility enforcement uses the company FK.

3. **Soft Deletes**: Both `platform_channels` and `platform_messages` use soft delete patterns (deletedAt/DeletedAt) for audit trail preservation.

4. **Self-Referential Threading**: Messages support `parent_id` for threaded conversations. `reply_count` is denormalized for fast query access.

5. **MCP Compatibility**: Messages include `structured_payload` (JSONB) alongside plain text for agent-to-agent structured communication with model context protocol.

6. **Partial Indexes**: Channel memberships enforce uniqueness only for active members (WHERE left_at IS NULL).

7. **Cascading Deletes**: Messages cascade from channels. Reactions and file attachments cascade from messages.

## Verification
After integration:
- `pnpm -r typecheck` passes
- `pnpm db:generate` produces migration
- All 7 tables exist in the database
- Foreign keys enforce referential integrity
- Indexes support the required query patterns
