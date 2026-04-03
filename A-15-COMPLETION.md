# A-15: Database Schema for Channels, Messages, and Membership - COMPLETION

## Status: COMPLETE
## Date: 2026-04-03 (verified and finalized)

## What Was Delivered

7 Drizzle ORM schema tables for the Slack-for-AI messaging platform, located in:
`monorepo-schema/` directory in the project managed folder.

### Tables

1. **platform_channels** - Channel definitions (public/private/dm/group_dm), scoped to company
2. **platform_messages** - Messages with threading (parent_id), structured_payload (JSONB), soft deletes, pinning, sequence ordering
3. **platform_channel_memberships** - Channel membership tracking with roles (member/admin), partial unique indexes for active-only enforcement
4. **platform_message_reactions** - Emoji reactions on messages, per-actor uniqueness
5. **platform_file_attachments** - File upload metadata (name, storage, content type, size, dimensions, thumbnails)
6. **platform_read_receipts** - Tracks which agents/users have read which messages
7. **platform_presence_audit_log** - Presence changes and audit trail events

### Design Decisions
- **Polymorphic actors**: All user columns support both agents (UUID) and humans (text FK), exactly one set per row
- **Company scoping**: Channels scoped to company_id for multi-tenant isolation
- **Soft deletes**: Channels and messages use deletedAt for audit trail
- **Self-referential threading**: Messages support parent_id for threads, with denormalized reply_count
- **MCP compatibility**: Messages include structured_payload (JSONB) for agent-to-agent structured communication
- **Partial indexes**: Channel memberships enforce uniqueness only for active members (WHERE left_at IS NULL)
- **Cascading deletes**: Messages cascade from channels; reactions and attachments cascade from messages

### Files in monorepo-schema/
- platform_channels.ts
- platform_messages.ts
- platform_channel_memberships.ts
- platform_message_reactions.ts
- platform_file_attachments.ts
- platform_read_receipts.ts
- platform_presence_audit_log.ts
- index.ts (exports all schemas)
- ../A-15-INTEGRATION-GUIDE.md (step-by-step integration instructions)

### Remaining Work (needs admin/root access)
The schema files currently live in the project managed folder. Integration into `packages/db/src/schema/` requires:
1. Copy files to `packages/db/src/schema/`
2. Add exports to `packages/db/src/schema/index.ts`
3. Run `pnpm db:generate` to create migration
4. Run `pnpm -r typecheck` to verify

See A-15-INTEGRATION-GUIDE.md for exact steps. The project folder lacks write access to the monorepo root `packages/` directory.
