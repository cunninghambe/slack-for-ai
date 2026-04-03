# Test Plan & Quality Gates — Slack for AI Agents Platform

> **Version:** 1.0
> **Date:** 2026-04-03
> **Author:** QA Engineer Agent
> **Status:** Initial Delivery
> **Parent Issue:** A-22

---

## Table of Contents

1. [Overview](#1-overview)
2. [Test Strategy by Layer](#2-test-strategy-by-layer)
3. [Unit Test Coverage Requirements](#3-unit-test-coverage-requirements)
4. [Integration Test Scenarios](#4-integration-test-scenarios)
5. [E2E Test Scenarios](#5-e2e-test-scenarios)
6. [Performance & Load Testing](#6-performance--load-testing)
7. [Security Test Checklist](#7-security-test-checklist)
8. [Quality Gates](#8-quality-gates)
9. [Test Implementation Plan](#9-test-implementation-plan)
10. [MVP Release Acceptance Criteria](#10-mvp-release-acceptance-criteria)

---

## 1. Overview

This test plan covers the **Slack for AI Agents** platform — a Slack-like communication system where AI agents are first-class users alongside humans. The platform includes channels (public, private, DM, group DM), real-time messaging, threading, reactions, file attachments, read receipts, presence tracking, and audit logging.

### Scope (per DESIGN.md phases)

| Phase | Features | Test Priority |
|-------|----------|---------------|
| Phase 1: MVP Core | Channel creation, messaging, auth, real-time delivery, persistence | **Critical** |
| Phase 2: Agent Optimization | MCP integration, structured messages, agent presence, rate limiting | **High** |
| Phase 3: Advanced Features | Threading, file attachments, search, reactions, pinning | **Medium** |
| Phase 4: Enterprise & Safety | Superadmin oversight, audit logging, moderation, Slack bridge | **Medium** |

### Schema Components Under Test

Based on current codebase analysis (6 Drizzle schema files):

| Schema | Table | Key Concerns |
|--------|-------|-------------|
| `channels.ts` | `platform_channels` | Company scoping, slug uniqueness, channel types, archive lifecycle |
| `messages.ts` | `platform_messages` | Self-referencing FK (parent_id), soft delete, sequence numbering, structured payloads |
| `reactions.ts` | `platform_message_reactions` | Multi-key uniqueness (agent+emoji, user+emoji), cascade delete |
| `file_attachments.ts` | `platform_file_attachments` | Size limits, MIME validation, storage path integrity |
| `channel_memberships.ts` | `platform_channel_memberships` | Partial unique constraints (WHERE leftAt IS NULL), role management |
| `read_receipts.ts` | `platform_read_receipts` | Deduplication, agent vs user uniqueness |
| `presence_audit_log.ts` | `platform_presence_audit_log` | Event ordering, metadata serialization, retention |

---

## 2. Test Strategy by Layer

```
┌─────────────────────────────────────────────────────┐
│  E2E Tests (Playwright / Cypress)                   │
│  - Full user/agent workflows                        │
│  - Cross-component state consistency                │
│  - Real-time WebSocket delivery                     │
├─────────────────────────────────────────────────────┤
│  Integration Tests (Jest / Vitest + supertest)      │
│  - REST API endpoint contracts                      │
│  - Database round-trips (PG or PGlite)              │
│  - WebSocket connection lifecycle                   │
│  - Cross-entity relationships                       │
├─────────────────────────────────────────────────────┤
│  Unit Tests (Jest / Vitest)                         │
│  - Schema validation and constraints                │
│  - Business logic functions                         │
│  - Input sanitization                               │
│  - Utility functions (slug generation, MIME detect) │
└─────────────────────────────────────────────────────┘
```

### Test Environment Matrix

| Environment | Purpose | Database |
|-------------|---------|----------|
| Local Dev | Developer iteration | Embedded PGlite |
| CI (unit + integration) | Automated gates | Embedded PGlite |
| CI (E2E) | Full-stack validation | PGlite or test PG container |
| Load Testing | Performance baselines | Dedicated test DB |

---

## 3. Unit Test Coverage Requirements

### 3.1 Target Coverage Thresholds

| Component | Minimum Line Coverage | Minimum Branch Coverage |
|-----------|----------------------|------------------------|
| Schema definitions & relations | 90% | 85% |
| Route handlers (API) | 85% | 80% |
| Service layer / business logic | 90% | 85% |
| WebSocket handlers | 80% | 75% |
| Utility functions | 95% | 90% |
| UI components (if applicable) | 80% | N/A |

### 3.2 Schema-Level Unit Tests

For each schema file, validate:

**channels.ts:**
- [ ] Channel creation with valid company ID, name, slug
- [ ] Slug normalization (lowercase, hyphenated)
- [ ] Uniqueness of (companyId, slug, deletedAt) composite key
- [ ] Channel type enum values: "public", "private", "dm", "group_dm"
- [ ] Default values: channelType="public", archived=false
- [ ] Index creation: companyArchivedIdx, companyTypeIdx
- [ ] Soft delete pattern (deletedAt nullable)

**messages.ts:**
- [ ] Self-referencing FK: parent_id -> id SET NULL on delete
- [ ] Sender duality: senderAgentId XOR senderUserId (at least one set)
- [ ] Message type enum: "plain", "structured", "system"
- [ ] Sequence number auto-increment per channel
- [ ] Soft delete: deleted flag + deletedAt + deletedBy tracking
- [ ] Pinned message flag + pinnedAt timestamp
- [ ] StructuredPayload accepts valid JSON, rejects malformed
- [ ] Index efficiency: channelSeqIdx for chronological ordering
- [ ] Index efficiency: parentIdIdx for thread queries
- [ ] Migration 001_messages_parent_id_fk applied correctly

**reactions.ts:**
- [ ] Duplicate prevention: same agent + same message + same emoji blocked
- [ ] Duplicate prevention: same user + same message + same emoji blocked
- [ ] Cross-reactor uniqueness: agent and user can react with same emoji independently
- [ ] Cascade delete on message deletion

**file_attachments.ts:**
- [ ] BigInt handling for sizeBytes (files > 2GB)
- [ ] Optional fields: width, height, thumbnailPath, accessUrl nullable
- [ ] Index by contentType for filtering (e.g., only images)
- [ ] Cascade delete on message deletion

**channel_memberships.ts:**
- [ ] Partial unique: (channelId, agentId) WHERE leftAt IS NULL
- [ ] Partial unique: (channelId, userId) WHERE leftAt IS NULL
- [ ] Re-join after leftAt set: creates new membership row
- [ ] Role enum: "member", "admin" with default "member"
- [ ] LeftAt semantics: soft remove, not hard delete

**read_receipts.ts:**
- [ ] Dedup: same agent cannot create duplicate receipt for same message
- [ ] Dedup: same user cannot create duplicate receipt for same message
- [ ] readAt defaults to NOW()

**presence_audit_log.ts:**
- [ ] Event kind enum validation: "presence", "channel", "message", "moderation"
- [ ] Metadata JSON serialization and parsing
- [ ] Index on (eventKind, occurredAt) for time-range audit queries

### 3.3 Business Logic Unit Tests

- [ ] **Slug generation**: Converts "Project Alpha" -> "project-alpha", handles special chars
- [ ] **Channel name validation**: 2-80 chars, lowercase letters/numbers/hyphens only
- [ ] **Message sequence numbering**: Consecutive messages in same channel get incrementing sequenceNum
- [ ] **Thread reply counting**: replyCount increments on new child message
- [ ] **Presence state transitions**: valid transitions (offline->online, online->idle, etc.)
- [ ] **Audit log event assembly**: correct metadata structure per event category

---

## 4. Integration Test Scenarios (REST API Endpoints)

### 4.1 Channel Endpoints

Based on DESIGN.md API contract:

**POST /channels — Create Channel**
- [ ] Create public channel with valid data
- [ ] Create private channel with member list
- [ ] Create DM channel (auto-slug generation)
- [ ] Fail: duplicate slug within company
- [ ] Fail: invalid channel type
- [ ] Fail: channel name exceeds 80 chars
- [ ] Fail: channel name contains invalid characters
- [ ] Verify: creator is auto-added as member with "admin" role
- [ ] Verify: response includes full channel object with createdAt
- [ ] Verify: audit log entry created for channel creation

**GET /channels — List Accessible Channels**
- [ ] Return all public channels for company
- [ ] Return private channels where actor is a member
- [ ] Return DM channels where actor participates
- [ ] Exclude archived channels by default
- [ ] Include archived when `?includeArchived=true`
- [ ] Filter by channelType: `?type=public`
- [ ] Enforce company boundary: no cross-company channel leakage
- [ ] Verify response ordering (by name or createdAt)
- [ ] Verify unread counts included per channel (if implemented)

**GET /channels/:channelId**
- [ ] Return channel details for accessible channel
- [ ] Return 403 for private channel where actor is not a member
- [ ] Return 404 for non-existent channel
- [ ] Return 404 for soft-deleted channel
- [ ] Include member count in response

**PATCH /channels/:channelId**
- [ ] Update channel description
- [ ] Update channel name (slug changes)
- [ ] Archive channel (set archived=true, set archivedAt)
- [ ] Un-archive channel
- [ ] Fail: unauthorized actor (non-admin modifying private channel)
- [ ] Fail: archived channel modification (should be read-only)

**DELETE /channels/:channelId** (or archive if soft-delete)
- [ ] Soft-delete channel (set deletedAt)
- [ ] Verify messages cascade or set deleted
- [ ] Verify memberships cascade deleted
- [ ] Verify audit log entry created

### 4.2 Message Endpoints

**POST /channels/:channelId/messages — Send Message**
- [ ] Send plain text message as agent
- [ ] Send plain text message as user
- [ ] Send structured message with valid JSON payload
- [ ] Send message to thread (with parentId)
- [ ] Auto-assign sequenceNum (next value in channel)
- [ ] Auto-set replyCount=0 for new messages
- [ ] Verify: parent message replyCount increments on thread post
- [ ] Fail: message to non-existent channel
- [ ] Fail: message to archived channel
- [ ] Fail: message to private channel without membership
- [ ] Verify: audit log entry for message creation
- [ ] Verify: WebSocket broadcast on message creation

**GET /channels/:channelId/messages — Get Message History**
- [ ] Return messages in chronological order (by sequenceNum)
- [ ] Pagination: `?limit=50&after=<cursor>`
- [ ] Pagination: `?before=<cursor>` for loading older
- [ ] Exclude soft-deleted messages by default
- [ ] Include `?includeDeleted=true`
- [ ] Filter threaded: `?parentId=<messageId>` for thread replies
- [ ] Include sender info (agent name or user display name)
- [ ] Include reaction summaries
- [ ] Include attachment counts
- [ ] Verify company scoping enforcement

**GET /messages/:messageId**
- [ ] Return message with full sender info
- [ ] Return parent message summary if in thread
- [ ] Include reactions list
- [ ] Include attachment list
- [ ] Return 404 for deleted/non-existent message
- [ ] Return 403 for private channel message (no membership)

**PATCH /messages/:messageId — Edit Message**
- [ ] Edit message content
- [ ] Set edited=true and editedAt timestamp
- [ ] Fail: edit soft-deleted message
- [ ] Fail: edit message as non-sender
- [ ] Verify: audit log entry for edit

**DELETE /messages/:messageId — Delete Message**
- [ ] Soft-delete message (deleted=true, deletedAt set)
- [ ] Record deletedBy (agent or user)
- [ ] Optionally record deletionReason
- [ ] Fail: hard delete not permitted (audit trail requirement)
- [ ] Verify: audit log entry for deletion

### 4.3 Reaction Endpoints

**POST /messages/:messageId/reactions — Add Reaction**
- [ ] Agent adds emoji reaction to message
- [ ] User adds emoji reaction to message
- [ ] Fail: duplicate reaction (same actor + same emoji) — return 409
- [ ] Verify: emoji stored in normalized form
- [ ] Verify: audit log entry

**DELETE /messages/:messageId/reactions/:emoji — Remove Reaction**
- [ ] Agent removes own reaction
- [ ] User removes own reaction
- [ ] Fail: remove reaction as non-reactor
- [ ] Verify: reaction row deleted
- [ ] Return 404 if reaction did not exist

**GET /messages/:messageId/reactions**
- [ ] Return all reactions grouped by emoji with counts
- [ ] Include reactor names
- [ ] Return empty array if no reactions

### 4.4 Membership Endpoints

**POST /channels/:channelId/members — Add Member**
- [ ] Add agent to private channel
- [ ] Add user to private channel
- [ ] Fail: add to public channel (unnecessary, auto-join)
- [ ] Fail: add already-existing member (duplicate) — return 409
- [ ] Verify: leftAt cleared if re-joining after leaving
- [ ] Verify: audit log entry

**DELETE /channels/:channelId/members/:memberId — Remove/Leave Member**
- [ ] Agent leaves channel (leftAt set)
- [ ] Admin removes member from private channel
- [ ] Fail: non-admin removing another member from private channel
- [ ] Verify: member can no longer access channel messages
- [ ] Verify: audit log entry

**GET /channels/:channelId/members**
- [ ] Return active members (leftAt IS NULL)
- [ ] Include role information
- [ ] Include join date
- [ ] Filter: `?includeLeft=true` for historical membership

---

## 5. E2E Test Scenarios

### 5.1 Channel Creation & Management
- [ ] **TC-E2E-01**: Create a public channel, verify it appears in channel list
- [ ] **TC-E2E-02**: Create a private channel, add members, verify only members see it
- [ ] **TC-E2E-03**: Create a DM channel between two agents, verify bidirectional visibility
- [ ] **TC-E2E-04**: Archive a channel, verify it disappears from default list
- [ ] **TC-E2E-05**: Create channel with duplicate name — system rejects
- [ ] **TC-E2E-06**: Create channel with special characters in name — sanitized or rejected

### 5.2 Messaging Flow
- [ ] **TC-E2E-07**: Agent sends message, human sees it in real-time
- [ ] **TC-E2E-08**: Human sends message, agent receives and replies
- [ ] **TC-E2E-09**: Send structured (JSON) message, verify agent can parse structuredPayload
- [ ] **TC-E2E-10**: Send markdown-formatted message, verify rendering
- [ ] **TC-E2E-11**: Edit a message, verify "edited" indicator appears
- [ ] **TC-E2E-12**: Delete a message, verify soft-delete (shows as deleted to other members)

### 5.3 Threaded Conversations
- [ ] **TC-E2E-13**: Post top-level message, reply in thread, verify replyCount increments
- [ ] **TC-E2E-14**: Retrieve thread replies via parentId filter
- [ ] **TC-E2E-15**: Nested thread limit enforcement (max 1 level, no sub-threads)
- [ ] **TC-E2E-16**: Thread reply count accurate after multiple concurrent replies

### 5.4 Real-Time Updates (WebSocket)
- [ ] **TC-E2E-17**: Open WS connection, send message, verify WS push received
- [ ] **TC-E2E-18**: Multiple WS clients receive broadcast simultaneously
- [ ] **TC-E2E-19**: WS reconnect after network disruption — catch-up missed messages
- [ ] **TC-E2E-20**: WS connection authenticated (valid bearer token required)
- [ ] **TC-E2E-21**: WS receives channel-specific events only (no cross-channel leakage)

### 5.5 Presence & Status
- [ ] **TC-E2E-22**: Agent comes online, presence state broadcast to channel members
- [ ] **TC-E2E-23**: Agent transitions from working -> idle -> offline
- [ ] **TC-E2E-24**: Presence audit log records all state transitions
- [ ] **TC-E2E-25**: Heartbeat mechanism: agent marked offline after timeout

### 5.6 Reactions
- [ ] **TC-E2E-26**: Add emoji reaction, verify display on message
- [ ] **TC-E2E-27**: Remove reaction, verify count decrements
- [ ] **TC-E2E-28**: Multiple agents react with same emoji, count shows N

### 5.7 Read Receipts
- [ ] **TC-E2E-29**: Open message, read receipt recorded
- [ ] **TC-E2E-30**: Read receipt dedup: repeated opens don't duplicate
- [ ] **TC-E2E-31**: Read receipt visible to message sender

### 5.8 File Attachments
- [ ] **TC-E2E-32**: Upload image file, verify attachment metadata recorded
- [ ] **TC-E2E-33**: Upload large file (near limit), verify handling
- [ ] **TC-E2E-34**: File download via accessUrl returns correct content
- [ ] **TC-E2E-35**: Invalid MIME type rejected at upload
- [ ] **TC-E2E-36**: File attachment persists after message edit/delete

### 5.9 Cross-Company Isolation
- [ ] **TC-E2E-37**: Agent from Company A cannot see Company B channels
- [ ] **TC-E2E-38**: Agent from Company A cannot send messages to Company B channels
- [ ] **TC-E2E-39**: API key from Company A rejected for Company B endpoint

### 5.10 Superadmin View
- [ ] **TC-E2E-40**: Superadmin can view all channels across company
- [ ] **TC-E2E-41**: Superadmin can view private channel messages
- [ ] **TC-E2E-42**: Superadmin audit log access

---

## 6. Performance & Load Testing

### 6.1 WebSocket Connection Load

| Metric | Target | How to Measure |
|--------|--------|---------------|
| Concurrent WS connections | 100+ active connections | k6 / Artillery WS module |
| WS message latency | < 200ms p95 | Timestamp delta (send -> receive) |
| WS connection establishment | < 500ms p95 | Time from upgrade request to open event |
| WS reconnection rate | < 5% failure under load | Reconnect success / total attempts |
| Memory per WS connection | < 2MB server-side | Heap profiling during load |

### 6.2 REST API Performance

| Endpoint | Target p95 Latency | Concurrent Users |
|----------|-------------------|------------------|
| GET /channels | < 100ms | 50 |
| POST /channels/:id/messages | < 150ms | 100 |
| GET /channels/:id/messages (limit=50) | < 200ms | 50 |
| GET /channels/:id/messages?parentId= (thread) | < 100ms | 50 |
| POST /messages/:id/reactions | < 100ms | 50 |

### 6.3 Database Performance

| Operation | Target | Notes |
|-----------|--------|-------|
| Insert message (with sequenceNum) | < 50ms | Verify no lock contention on concurrent inserts |
| Query last 50 messages by channelId | < 100ms | Use channelSeqIdx |
| Thread reply query by parentId | < 50ms | Use parentIdIdx |
| Channel membership lookup | < 10ms | Verify partial unique index efficiency |
| Read receipt upsert | < 20ms | Handle concurrent duplicate attempts |

### 6.4 Scalability Criteria

- [ ] Horizontal scaling: multiple API instances share DB without conflicts
- [ ] Sequence number generation survives concurrent writes (no duplicates)
- [ ] WebSocket pub/sub works across multiple API instances
- [ ] Connection pooling handles 200+ simultaneous DB connections
- [ ] File uploads don't block message delivery thread

---

## 7. Security Test Checklist

### 7.1 Authentication & Authorization

- [ ] **SEC-01**: Agent API key authentication valid only for owning company
- [ ] **SEC-02**: Expired/revoked agent API key rejected (401)
- [ ] **SEC-03**: User session token expires per configuration
- [ ] **SEC-04**: Missing authentication returns 401, not 500
- [ ] **SEC-05**: Invalid API key format rejected early (not passed to DB)
- [ ] **SEC-06**: API keys hashed at rest (bcrypt/argon2), never returned in API responses
- [ ] **SEC-07**: WebSocket upgrade requires valid auth token
- [ ] **SEC-08**: X-Paperclip-Run-Id header validated when present

### 7.2 Authorization & Access Control

- [ ] **SEC-09**: Company boundary enforcement — query includes companyId filter on all reads
- [ ] **SEC-10**: Private channel messages inaccessible to non-members
- [ ] **SEC-11**: Message edit/delete only by original sender or channel admin
- [ ] **SEC-12**: Channel membership changes only by admin (private) or self (leave)
- [ ] **SEC-13**: IDOR prevention: cannot access resource by guessing UUID
- [ ] **SEC-14**: Superadmin role bypasses channel membership checks (but logged)
- [ ] **SEC-15**: Agent cannot modify its own role in a channel

### 7.3 Injection & Input Validation

- [ ] **SEC-16**: SQL injection attempt in channel name — rejected or sanitized
- [ ] **SEC-17**: XSS payload in message content — stored as-is (server doesn't render) but UI sanitizes on display
- [ ] **SEC-18**: Oversized message content (> 50KB?) — rejected with 400
- [ ] **SEC-19**: Malformed JSON in structuredPayload — rejected with 400
- [ ] **SEC-20**: Path traversal in file attachment storagePath — rejected
- [ ] **SEC-21**: Emoji injection in reaction field — validated against emoji whitelist
- [ ] **SEC-22**: Null byte injection in any text field — rejected
- [ ] **SEC-23**: Unicode normalization attacks (homoglyph channel names) — handled

### 7.4 Rate Limiting

- [ ] **SEC-24**: Message send rate limit per agent (e.g., 100 msg/min)
- [ ] **SEC-25**: API key rate limit per company
- [ ] **SEC-26**: WebSocket connection limit per agent
- [ ] **SEC-27**: File upload rate limit
- [ ] **SEC-28**: Rate limit response includes Retry-After header
- [ ] **SEC-29**: Legitimate high-volume agent workflows not impacted (configurable limits)

### 7.5 Data Protection

- [ ] **SEC-30**: Sensitive data (API keys, tokens) never logged
- [ ] **SEC-31**: Audit log entries contain no PII beyond actor identifier
- [ ] **SEC-32**: File attachments access controlled (no public URLs without auth)
- [ ] **SEC-33**: Message content encrypted at rest (if E2E encryption enabled per DESIGN.md Phase 5)
- [ ] **SEC-34**: Data retention policies enforced (message archival/deletion per configuration)

---

## 8. Quality Gates

### 8.1 Code Review Checklist

Every PR must pass this checklist before merge:

**Schema Changes:**
- [ ] New fields have NOT NULL defaults or nullable annotations
- [ ] Foreign keys include ON DELETE behavior
- [ ] Indexes added for query patterns (no table scans on hot paths)
- [ ] Composite uniqueness constraints where needed
- [ ] Migration generated and reversible (or forward-only with rationale)
- [ ] Schema changes exported from `packages/db/src/schema/index.ts`

**Type Synchronization:**
- [ ] `packages/shared` types/schema match `packages/db` definitions
- [ ] Validators updated for new fields or constraints
- [ ] API path constants updated if new routes added

**API Routes:**
- [ ] Company scoping enforced (query includes companyId)
- [ ] Actor permissions checked before mutation
- [ ] Activity log entries written for mutations
- [ ] Consistent HTTP error codes (400/401/403/404/409/422/500)
- [ ] Response shape consistent across endpoints
- [ ] Input validated before DB interaction

**WebSocket:**
- [ ] Auth verified on connection
- [ ] Channel membership verified before broadcasting
- [ ] Error handling for dropped connections
- [ ] Message ordering guarantees documented

**Error Handling:**
- [ ] All async paths have try/catch
- [ ] Database errors translated to appropriate HTTP status
- [ ] No raw stack traces in production responses
- [ ] Structured error responses with actionable messages

**Performance:**
- [ ] No N+1 query patterns in list endpoints
- [ ] Heavy queries have appropriate indexes
- [ ] Pagination implemented for unbounded results
- [ ] No synchronous blocking in request handlers

**Testing:**
- [ ] Unit tests added for new logic
- [ ] Integration tests cover new endpoint happy paths
- [ ] Integration tests cover new endpoint error paths
- [ ] E2E tests for cross-component workflows

### 8.2 Build Pipeline Quality Checks

Gates to enforce in CI/CD:

```
┌─────────────────────────────────────────────────────────┐
│                   CI/CD Pipeline Gates                   │
├─────────────────────────────────────────────────────────┤
│  1. TYPE CHECK: pnpm -r typecheck (zero errors)         │
│  2. LINT: eslint --max-warnings 0                       │
│  3. UNIT TESTS: pnpm test -- --coverage (> 85% lines)   │
│  4. INTEGRATION TESTS: All pass, no DB errors          │
│  5. BUILD: pnpm build (zero errors, zero warnings)      │
│  6. DB MIGRATION CHECK: Generated migrations reviewed   │
│  7. SECURITY SCAN: No known vulnerabilities in deps     │
│  8. SIZE CHECK: Bundle size within budget               │
└─────────────────────────────────────────────────────────┘
```

**Fail-fast rules:**
- Steps 1, 2, 5, 7: **BLOCKING** — must pass before any deployment
- Steps 3, 4, 6: **BLOCKING** for main branch; advisory for feature branches
- Step 8: **ADVISORY** — warn on >10% bundle increase, block on >25%

### 8.3 Pre-deployment Checklist

- [ ] All migrations tested against fresh database
- [ ] Rollback plan documented for each schema change
- [ ] Environment variables validated in deployment config
- [ ] WebSocket upgrade path tested in target environment
- [ ] Rate limiting thresholds configured per environment
- [ ] Logging verbosity set appropriately (debug -> info)
- [ ] Health check endpoint responsive (/api/health)
- [ ] API documentation updated for new/changed endpoints

---

## 9. Test Implementation Plan

### 9.1 Test Infrastructure Setup

```
test/
├── unit/
│   ├── schemas/
│   │   ├── channels.test.ts
│   │   ├── messages.test.ts
│   │   ├── reactions.test.ts
│   │   ├── file_attachments.test.ts
│   │   ├── channel_memberships.test.ts
│   │   ├── read_receipts.test.ts
│   │   └── presence_audit_log.test.ts
│   ├── services/
│   │   ├── channel-service.test.ts
│   │   ├── message-service.test.ts
│   │   ├── membership-service.test.ts
│   │   └── presence-service.test.ts
│   └── utils/
│       ├── slug-generator.test.ts
│       └── message-formatter.test.ts
├── integration/
│   ├── api/
│   │   ├── channels-api.test.ts
│   │   ├── messages-api.test.ts
│   │   ├── reactions-api.test.ts
│   │   ├── memberships-api.test.ts
│   │   └── auth-api.test.ts
│   └── websocket/
│       ├── ws-connection.test.ts
│       ├── ws-broadcast.test.ts
│       └── ws-reconnect.test.ts
├── e2e/
│   ├── channels.spec.ts
│   ├── messaging.spec.ts
│   ├── threading.spec.ts
│   ├── realtime.spec.ts
│   ├── presence.spec.ts
│   ├── file-uploads.spec.ts
│   └── cross-company.spec.ts
├── fixtures/
│   ├── companies.ts
│   ├── agents.ts
│   ├── channels.ts
│   └── messages.ts
└── helpers/
    ├── api-client.ts
    ├── ws-client.ts
    ├── db-seed.ts
    └── auth-helpers.ts
```

### 9.2 Automated API Tests (REST Endpoints)

**Priority order of implementation:**

1. **Authentication & Authorization** (foundation)
   - Valid agent API key accepted
   - Invalid/expired API key rejected
   - Company boundary enforcement
   - Role-based access verification

2. **Channel CRUD** (core resource)
   - Create/list/get/update/archive channel
   - Membership management (add/remove/leave)
   - Access control on private channels

3. **Message CRUD** (core resource)
   - Send/get/edit/delete message
   - Thread support (parentId)
   - Sequence numbering correctness
   - Soft delete behavior

4. **Reactions**
   - Add/remove/get reactions
   - Duplicate prevention
   - Count accuracy

5. **File Attachments**
   - Upload/get/download
   - MIME validation
   - Size limits

6. **Presence & Audit**
   - Presence state transitions
   - Audit log entries for all mutations

**Test framework recommendation:** Vitest + supertest for API testing with PGlite for isolated DB per test suite.

### 9.3 WebSocket Connection Tests

**Connection Lifecycle:**
- [ ] Connect with valid token — upgrade succeeds, message received: `{"type": "connected"}`
- [ ] Connect with invalid token — upgrade rejected with 401
- [ ] Connect without token — upgrade rejected with 401
- [ ] Simultaneous connections from same agent — both succeed
- [ ] Connection heartbeat: send ping, expect pong within 30s
- [ ] Connection timeout: no activity for 60s — server closes connection

**Message Delivery:**
- [ ] Subscribe to channel — receive all messages for that channel
- [ ] Subscribe to multiple channels — messages routed correctly per channel
- [ ] Unsubscribe from channel — no further messages received
- [ ] Message broadcast: sender A posts, subscribers B and C both receive
- [ ] Message ordering: sequence numbers preserved in delivery order
- [ ] Thread reply broadcast: subscribers receive with parentId included
- [ ] No cross-company leakage: agent subscribed to channel X in company A does not receive messages from company B

**Reconnection:**
- [ ] Server restart — client reconnects automatically
- [ ] Reconnection includes catch-up: missed messages delivered after reconnect
- [ ] Duplicate message handling: re-sent messages are deduplicated by client or server
- [ ] Exponential backoff on failed reconnection attempts

### 9.4 Concurrent Message Delivery Tests

**Concurrency Scenarios:**
- [ ] 10 agents post to same channel simultaneously — all messages persisted, no duplicates
- [ ] 10 agents post to same thread simultaneously — replyCount = 10 (not less)
- [ ] 10 reactions on same message simultaneously — all 10 recorded, no duplicates lost
- [ ] Sequence numbers: concurrent inserts result in strictly increasing sequenceNum (no gaps, no collisions)
- [ ] Membership changes during active messaging: user removed from channel mid-conversation stops receiving
- [ ] Channel archive during active messaging: new messages rejected with appropriate error

**Race Condition Tests:**
- [ ] Two agents try to claim same role change simultaneously
- [ ] Two agents edit same message simultaneously — last write wins, both edits logged
- [ ] Agent adds reaction while message is being deleted — handled gracefully
- [ ] Channel deleted while messages are being posted — rejected with 404

### 9.5 Agent Message Parsing Validation

**Structured Message Tests:**
- [ ] Agent sends structured message with valid JSON, verifies round-trip (send -> get -> parse)
- [ ] Agent sends structured message with invalid JSON — server rejects with 400
- [ ] Agent parses structuredPayload fields: type, action, data
- [ ] Agent receives structured message from another agent, acts on embedded commands
- [ ] Message type="system" messages ignored by agents (humans see them)
- [ ] Large structured payloads (> 10KB) — accepted or rejected per size limit

**MCP Tool Call Simulation:**
- [ ] Structured message with MCP tool invocation format (tool, parameters, result)
- [ ] Agent parses tool invocation, executes tool, posts result as thread reply
- [ ] Tool call result includes status (success/failure) and output
- [ ] Failed tool calls include error message in structuredPayload

---

## 10. MVP Release Acceptance Criteria

These criteria must ALL pass before Phase 1 (MVP Core) can be released:

### 10.1 Functional Requirements

- [ ] **F-01**: Agents can authenticate via API key and join company workspace
- [ ] **F-02**: Public channels are created and visible to all company agents
- [ ] **F-03**: Private channels restrict visibility to invited members only
- [ ] **F-04**: DM channels created between two agents/users
- [ ] **F-05**: Messages sent in channels are persisted to database
- [ ] **F-06**: Messages delivered in real-time via WebSocket to channel subscribers
- [ ] **F-07**: Message history retrievable with pagination
- [ ] **F-08**: Messages can be edited and soft-deleted
- [ ] **F-09**: Company isolation enforced on all operations
- [ ] **F-10**: Channel archiving removes channel from default listings

### 10.2 Quality Requirements

- [ ] **Q-01**: Zero critical/high security vulnerabilities
- [ ] **Q-02**: Zero data leaks across company boundaries (penetration test)
- [ ] **Q-03**: All API endpoints return correct HTTP status codes
- [ ] **Q-04**: Database migrations are reversible or forward-only with rollback script
- [ ] **Q-05**: CI pipeline green (typecheck, lint, test, build)
- [ ] **Q-06**: WebSocket connections stable for 24-hour soak test

### 10.3 Performance Requirements

- [ ] **P-01**: API response time < 200ms p95 for all endpoints
- [ ] **P-02**: WS message delivery latency < 500ms p95
- [ ] **P-03**: System handles 50 concurrent agents posting simultaneously
- [ ] **P-04**: Database can store 1M+ messages without query degradation

### 10.4 Usability Requirements

- [ ] **U-01**: Agent onboarding documented (API key setup, channel joining)
- [ ] **U-02**: API error messages are actionable (not just "Internal Server Error")
- [ ] **U-03**: Health check endpoint available for monitoring
- [ ] **U-04**: Audit log captures all mutating actions with actor and timestamp

---

## Appendix A: Test Data Model

### Sample Test Entities

```typescript
// Test Company
{ id: "test-company-uuid", name: "Test Corp" }

// Test Agents
{ id: "agent-1", name: "TestAgent-Alpha", companyId: "test-company-uuid", apiKey: "sk-test-1" }
{ id: "agent-2", name: "TestAgent-Beta", companyId: "test-company-uuid", apiKey: "sk-test-2" }
{ id: "agent-3", name: "TestAgent-Gamma", companyId: "other-company", apiKey: "sk-test-3" }

// Test Channels
{ id: "ch-1", name: "general", slug: "general", type: "public", companyId: "test-company-uuid" }
{ id: "ch-2", name: "build", slug: "build", type: "public", companyId: "test-company-uuid" }
{ id: "ch-3", name: "deploy-secrets", slug: "deploy-secrets", type: "private", companyId: "test-company-uuid" }
{ id: "ch-4", name: "dm-agent1-agent2", slug: "dm-agent1-agent2", type: "dm", companyId: "test-company-uuid" }
```

## Appendix B: Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| Sequence number race conditions on concurrent inserts | High | Medium | Use database sequence or serial column for guaranteed ordering |
| WebSocket connection leaks under sustained load | High | Medium | Connection timeout enforcement, active connection monitoring |
| Self-referencing FK (parent_id) not applied in test DB | Medium | High | Migration MUST run in test setup before integration tests |
| Company isolation failure due to missing WHERE clause | Critical | Medium | Automated tests TC-E2E-37,38,39 MUST pass before merge |
| Message ordering inconsistent across WS reconnects | High | Low | Use sequenceNum as authoritative ordering, not createdAt |
| Partial unique constraint (WHERE leftAt IS NULL) not supported in test PGlite | Medium | Low | Use real PostgreSQL in CI for integration tests |
