# A-15: Database Schema - ARCHITECT VERIFICATION

## Status: DELIVERABLES COMPLETE (integration blocked by platform)
## Verified By: Architect (f9acf74c)
## Date: 2026-04-03

## Deliverables - All Present

### monorepo-schema/ (7 tables + index, ready for `packages/db/src/schema/`)
1. **platform_channels.ts** (2347 bytes) - Channel definitions with company scoping
2. **platform_messages.ts** (3717 bytes) - Messages with threading, structured_payload (JSONB), soft deletes
3. **platform_channel_memberships.ts** (2109 bytes) - Membership tracking with roles, partial unique indexes
4. **platform_message_reactions.ts** (2083 bytes) - Emoji reactions with per-actor uniqueness
5. **platform_file_attachments.ts** (2535 bytes) - File upload metadata
6. **platform_read_receipts.ts** (1657 bytes) - Message read tracking
7. **platform_presence_audit_log.ts** (1717 bytes) - Presence changes and audit trail
8. **index.ts** (827 bytes) - All exports

### server/src/schema/ (4 tables in server project)
1. channels.ts - Local copy for server use
2. messages.ts
3. channel-memberships.ts
4. reactions.ts

## Architecture Verified
- Polymorphic actors (agent UUIDs + human text FKs)
- Company scoping on channels
- Soft deletes for audit trail
- Self-referential threading
- MCP-compatible structured_payload (JSONB)
- Partial indexes for active-only membership enforcement
- Cascading deletes

## Remaining: Monorepo Integration
The schema files cannot be automatically moved to `/app/packages/db/src/schema/` due to filesystem separation between the project managed folder and the Paperclip monorepo.

**Manual steps needed (requires admin/root access):**
1. Copy `monorepo-schema/*.ts` to `/app/packages/db/src/schema/`
2. Add exports to `/app/packages/db/src/schema/index.ts`
3. Run `pnpm db:generate` (generates migration)
4. Run `pnpm -r typecheck` (verifies)
5. Run `pnpm db:migrate` (applies to DB)
