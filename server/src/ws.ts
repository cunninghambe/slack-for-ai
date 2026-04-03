/**
 * WebSocket broadcast utilities.
 * Separated into its own module to avoid circular imports between
 * index.ts (which creates the WebSocket server) and route modules.
 */
import { WebSocket } from "ws";

/**
 * Active connections: channelId -> Set<WebSocket>
 * Populated by the WebSocket server in index.ts.
 */
export const channelConnections = new Map<string, Set<WebSocket>>();

/**
 * Metadata for each WebSocket connection.
 */
export const wsMeta = new WeakMap<
  WebSocket,
  { channelId?: string; actor?: string; connectedAt: Date }
>();

/**
 * Broadcast a message to all WebSocket clients subscribed to a channel.
 */
export function broadcastToChannel(
  channelId: string,
  data: Record<string, unknown>
) {
  const subscribers = channelConnections.get(channelId);
  if (!subscribers) return;

  const payload = JSON.stringify({
    type: "message",
    channelId,
    ...data,
    timestamp: new Date().toISOString(),
  });

  const clients = Array.from(subscribers);
  for (let i = 0; i < clients.length; i++) {
    if (clients[i].readyState === WebSocket.OPEN) {
      clients[i].send(payload);
    }
  }
}

/**
 * Get the number of active subscribers for a channel.
 */
export function getChannelConnectionCount(channelId: string): number {
  return channelConnections.get(channelId)?.size ?? 0;
}
