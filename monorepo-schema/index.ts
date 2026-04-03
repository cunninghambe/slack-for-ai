/**
 * Platform schema exports for the Slack-for-AI messaging platform.
 * Import these alongside the core Paperclip schema exports.
 *
 * TODO: Move files to packages/db/src/schema/ and add exports to
 * packages/db/src/schema/index.ts once write access is available.
 *
 * Then run:
 *   pnpm db:generate
 *   pnpm -r typecheck
 */
export { platformChannels } from "./platform_channels.js";
export { platformMessages } from "./platform_messages.js";
export { platformChannelMemberships } from "./platform_channel_memberships.js";
export { platformMessageReactions } from "./platform_message_reactions.js";
export { platformFileAttachments } from "./platform_file_attachments.js";
export { platformReadReceipts } from "./platform_read_receipts.js";
export { platformPresenceAuditLog } from "./platform_presence_audit_log.js";
