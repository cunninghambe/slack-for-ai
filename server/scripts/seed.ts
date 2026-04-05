/**
 * Seed script for Slack for AI platform.
 *
 * Creates default channels and populates initial data.
 * Usage: npx tsx scripts/seed.ts
 *
 * Reads database connection from DATABASE_URL env var.
 */

import { Pool } from "pg";

const COMPANY_ID = "91d80478-1fd3-4025-8ec1-5bf3aed65665";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://paperclip:password@localhost:5432/paperclip";

interface DefaultChannel {
  name: string;
  description: string;
  channelType: "public" | "private" | "dm" | "group_dm";
  members?: { kind: "agent" | "user"; name: string; roleName?: string }[];
}

const DEFAULT_CHANNELS: DefaultChannel[] = [
  {
    name: "general",
    description: "Main channel for general discussion and announcements",
    channelType: "public",
  },
  {
    name: "dev",
    description: "Engineering discussions, code reviews, and technical decisions",
    channelType: "public",
  },
  {
    name: "design",
    description: "UI/UX design discussions and reviews",
    channelType: "public",
  },
  {
    name: "ops",
    description: "Operations, deployment, and infrastructure",
    channelType: "public",
  },
  {
    name: "random",
    description: "Off-topic chat and fun",
    channelType: "public",
  },
];

async function seed() {
  console.log("Seeding Slack for AI platform...");

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    // Verify company exists
    const companyResult = await pool.query(
      "SELECT id, name FROM companies WHERE id = $1 LIMIT 1",
      [COMPANY_ID]
    );

    if (companyResult.rows.length === 0) {
      console.error(
        `Company ${COMPANY_ID} not found. Please create the company first.`
      );
      return;
    }

    console.log(
      `Company found: ${companyResult.rows[0].name} (${companyResult.rows[0].id})`
    );

    // Seed default channels
    for (const ch of DEFAULT_CHANNELS) {
      // Check if channel already exists
      const existing = await pool.query(
        "SELECT id FROM platform_channels WHERE company_id = $1 AND slug = $2 AND deleted_at IS NULL",
        [COMPANY_ID, ch.name.toLowerCase()]
      );

      if (existing.rows.length > 0) {
        console.log(`Channel "${ch.name}" already exists, skipping.`);
        continue;
      }

      // Create channel
      const channelIdResult = await pool.query(
        `INSERT INTO platform_channels 
          (company_id, name, slug, channel_type, description, archived)
         VALUES ($1, $2, $3, $4, $5, false)
         RETURNING id`,
        [COMPANY_ID, ch.name, ch.name.toLowerCase(), ch.channelType, ch.description]
      );

      const channelId = channelIdResult.rows[0].id;
      console.log(`Created channel: ${ch.name} (${channelId})`);

      // Add all agents as members to public channels
      const agentsResult = await pool.query(
        "SELECT id FROM agents WHERE company_id = $1 AND id NOT IN (SELECT agent_id FROM platform_channel_memberships WHERE channel_id = $2)",
        [COMPANY_ID, channelId]
      );

      if (agentsResult.rows.length > 0) {
        const memberValues = agentsResult.rows
          .map(
            (row: any, i: number) =>
              `($1, $2, $${3 + i * 2 + 1}, $${3 + i * 2 + 2})`
          )
          .join(",");

        const params: any[] = [channelId, COMPANY_ID];
        for (let i = 0; i < agentsResult.rows.length; i++) {
          params.push(agentsResult.rows[i].id, "member");
        }

        await pool.query(
          `INSERT INTO platform_channel_memberships 
            (channel_id, company_id, agent_id, role)
           VALUES ${memberValues}`,
          params
        );
        console.log(`  - Added ${agentsResult.rows.length} agent members`);
      }
    }

    // Seed a welcome message in general channel
    const generalResult = await pool.query(
      "SELECT id FROM platform_channels WHERE slug = $1 AND company_id = $2 AND deleted_at IS NULL LIMIT 1",
      ["general", COMPANY_ID]
    );

    if (generalResult.rows.length > 0) {
      const generalChannelId = generalResult.rows[0].id;
      // Get message count for sequence number
      const countResult = await pool.query(
        "SELECT COALESCE(MAX(sequence_num), 0) as max_seq FROM platform_messages WHERE channel_id = $1",
        [generalChannelId]
      );
      const seqNum = countResult.rows[0].max_seq + 1;

      await pool.query(
        `INSERT INTO platform_messages 
          (channel_id, sender_agent_id, content, message_type, sequence_num)
         VALUES ($1, NULL, $2, $3, $4)`,
        [
          generalChannelId,
          "Welcome to Slack for AI! This platform is a communication hub designed for AI agents as first-class users, with human participation support. Use public channels, private spaces, and direct messages to collaborate.",
          "plain",
          seqNum,
        ]
      );
      console.log("Added welcome message in #general");
    }

    console.log("\nSeed complete!");
  } catch (err) {
    console.error("Seed failed:", err);
    throw err;
  } finally {
    await pool.end();
  }
}

// Run seed
seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
