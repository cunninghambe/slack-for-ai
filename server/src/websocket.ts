/**
 * WebSocket server for real-time message delivery.
 * Clients connect and subscribe to channels to receive live updates.
 */
import { WebSocketServer, WebSocket as WSWebSocket } from "ws";
import { Server } from "http";
import { createHash } from "crypto";
import { db, agentApiKeys, agents as agentsTable, channels, channelMemberships } from "./db.js";
import { eq, and, isNull } from "drizzle-orm";
import type { AuthActor } from "./middleware/auth.js";

interface WSClient {
  ws: WSWebSocket;
  actor: AuthActor;
  displayName: string;
  subscribedChannels: Set<string>;
}

/** Map WebSocket -> client info */
const clients = new Map<WSWebSocket, WSClient>();

/** Map channelId -> Set of WebSocket clients subscribed to that channel */
const channelSubscribers = new Map<string, Set<WSWebSocket>>();

/**
 * Authenticate a WebSocket connection using a query parameter token.
 */
async function authenticateWS(token: string): Promise<AuthActor | null> {
  const keyDigest = createHash("sha256").update(token).digest("hex");

  const keyRecord = await db
    .select({ agentId: agentApiKeys.agentId })
    .from(agentApiKeys)
    .where(eq(agentApiKeys.keyHash, keyDigest))
    .limit(1);

  if (keyRecord.length === 0) return null;

  const agentRecord = await db
    .select({
      id: agentsTable.id,
      companyId: agentsTable.companyId,
      name: agentsTable.name,
      keyName: agentsTable.keyName,
    })
    .from(agentsTable)
    .where(eq(agentsTable.id, keyRecord[0].agentId))
    .limit(1);

  if (agentRecord.length === 0) return null;

  return {
    kind: "agent",
    id: agentRecord[0].id,
    companyId: agentRecord[0].companyId,
    keyName: agentRecord[0].keyName ?? undefined,
  };
}

/**
 * Send a JSON message to a WebSocket client.
 */
function sendJSON(ws: WSWebSocket, data: Record<string, unknown>): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

/**
 * Broadcast a message to all subscribers of a channel.
 */
export function broadcastToChannel(
  channelId: string,
  message: Record<string, unknown>
): void {
  const subscribers = channelSubscribers.get(channelId);
  if (!subscribers) return;

  const payload = JSON.stringify(message);
  subscribers.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
}

/**
 * Attach a WebSocket server to the existing HTTP server.
 */
export function attachWebSocket(server: Server): void {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
  });

  wss.on("connection", async (ws, req) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    const token = url.searchParams.get("token");

    if (!token) {
      ws.close(4001, "Missing token");
      return;
    }

    const actor = await authenticateWS(token);
    if (!actor) {
      ws.close(4003, "Invalid token");
      return;
    }

    const client: WSClient = {
      ws,
      actor,
      displayName: actor.keyName || actor.id.slice(0, 8),
      subscribedChannels: new Set(),
    };

    clients.set(ws, client);

    ws.on("message", async (raw) => {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(raw.toString());
      } catch {
        sendJSON(ws, { type: "error", message: "Invalid JSON" });
        return;
      }

      switch (data.type) {
        case "subscribe": {
          const channelId = data.channelId as string;
          if (!channelId) {
            sendJSON(ws, { type: "error", message: "Missing channelId" });
            return;
          }

          // Verify channel access
          const channel = await db.query.channels.findFirst({
            where: and(
              eq(channels.id, channelId),
              eq(channels.companyId, actor.companyId),
              isNull(channels.deletedAt)
            ),
          });

          if (!channel) {
            sendJSON(ws, { type: "error", message: "Channel not found" });
            return;
          }

          // For private channels, verify membership
          if (
            channel.channelType === "private" ||
            channel.channelType === "group_dm"
          ) {
            const membership = await db.query.channelMemberships.findFirst({
              where: and(
                eq(channelMemberships.channelId, channelId),
                actor.kind === "agent"
                  ? eq(channelMemberships.agentId, actor.id)
                  : eq(channelMemberships.userId, actor.id),
                isNull(channelMemberships.leftAt)
              ),
            });

            if (!membership) {
              sendJSON(ws, {
                type: "error",
                message: "Not a member of this channel",
              });
              return;
            }
          }

          client.subscribedChannels.add(channelId);

          if (!channelSubscribers.has(channelId)) {
            channelSubscribers.set(channelId, new Set());
          }
          channelSubscribers.get(channelId)!.add(ws);

          sendJSON(ws, {
            type: "subscribed",
            channelId,
          });

          // Broadcast presence to other subscribers
          const presencePayload = JSON.stringify({
            type: "presence",
            channelId,
            userId: actor.id,
            displayName: client.displayName,
            status: "available",
          });
          channelSubscribers.get(channelId)?.forEach((other) => {
            if (other !== ws && other.readyState === WSWebSocket.OPEN) {
              other.send(presencePayload);
            }
          });
          break;
        }

        case "unsubscribe": {
          const channelId = data.channelId as string;
          client.subscribedChannels.delete(channelId);
          const subs = channelSubscribers.get(channelId);
          if (subs) {
            subs.delete(ws);
            if (subs.size === 0) {
              channelSubscribers.delete(channelId);
            }
          }
          sendJSON(ws, {
            type: "unsubscribed",
            channelId,
          });

          // Broadcast offline presence to remaining subscribers
          const unsubPayload = JSON.stringify({
            type: "presence",
            channelId,
            userId: actor.id,
            displayName: client.displayName,
            status: "offline",
          });
          channelSubscribers.get(channelId)?.forEach((other) => {
            if (other.readyState === WSWebSocket.OPEN) {
              other.send(unsubPayload);
            }
          });
          break;
        }

        case "ping": {
          sendJSON(ws, { type: "pong" });
          break;
        }

        case "typing": {
          const channelId = data.channelId as string;
          // Broadcast typing to all OTHER subscribers of this channel
          const subs = channelSubscribers.get(channelId);
          if (subs) {
            const payload = JSON.stringify({
              type: "typing",
              channelId,
              userId: actor.id,
              displayName: client.displayName,
            });
            subs.forEach((other) => {
              if (other !== ws && other.readyState === WSWebSocket.OPEN) {
                other.send(payload);
              }
            });
          }
          break;
        }

        default:
          sendJSON(ws, {
            type: "error",
            message: `Unknown message type: ${data.type}`,
          });
      }
    });

    ws.on("close", () => {
      // Broadcast offline presence to all channels client was subscribed to
      const channels = Array.from(client.subscribedChannels);
      for (let i = 0; i < channels.length; i++) {
        const channelId = channels[i];
        const presencePayload = JSON.stringify({
          type: "presence",
          channelId,
          userId: actor.id,
          displayName: client.displayName,
          status: "offline",
        });
        const subs = channelSubscribers.get(channelId);
        if (subs) {
          subs.forEach((other) => {
            if (other.readyState === WSWebSocket.OPEN) {
              other.send(presencePayload);
            }
          });
        }
      }
      clients.delete(ws);
      // Clean up subscriptions
      channelSubscribers.forEach((subs, channelId) => {
        subs.delete(ws);
        if (subs.size === 0) {
          channelSubscribers.delete(channelId);
        }
      });
    });

    ws.on("error", (err) => {
      console.error("WS error:", err.message);
      clients.delete(ws);
    });

    sendJSON(ws, {
      type: "connected",
      actorId: actor.id,
    });
  });

  console.log("WebSocket server attached at /ws");
}
