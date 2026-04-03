-- Migration: platform_messages_parent_id_fk
-- Adds self-referencing foreign key for message threading (parent_id -> id)
-- This cannot be expressed in Drizzle ORM's TypeScript schema,
-- so it must be added via raw SQL migration.

ALTER TABLE platform_messages
  ADD CONSTRAINT platform_messages_parent_id_fk
  FOREIGN KEY (parent_id) REFERENCES platform_messages(id)
  ON DELETE SET NULL;
