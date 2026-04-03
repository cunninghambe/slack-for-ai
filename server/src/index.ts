/**
 * Slack-for-AI Platform Server
 * REST API for channels, messaging, reactions, memberships + WebSocket real-time layer.
 */
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import { parse } from "url";
import { v4 as uuidv4 } from "uuid";
import { pool } from "./db.js";
import { channelConnections, wsMeta } from "./ws.js";
import channelsRouter from "./routes/channels.js";
import messagesRouter from "./routes/messages.js";
import reactionsRouter from "./routes/reactions.js";
import membershipsRouter from "./routes/memberships.js";
import healthRouter from "./routes/health.js";
import metricsRouter from "./routes/metrics.js";
import { requestMetrics, errorTracker, rateLimiter } from "./middleware/monitoring.js";
import { correlationId } from "./middleware/correlation.js";
import { logger } from "./utils/logger.js";

const app = express();
const PORT = process.env.PORT ?? 3200;

// Create HTTP server first so we can attach WebSocket
const httpServer = createServer(app);

app.use(helmet());
app.use(cors({ origin: "*" }));
app.use(express.json());

// ─── Monitoring & Observability ──────────────────────────────
// 1. Correlation ID (runs first so all subsequent middleware has access)
app.use(correlationId);

// 2. Request metrics / structured logging
app.use(requestMetrics);

// 3. Rate limiting on all API routes (generous defaults for agent traffic)
app.use("/api", rateLimiter({ windowMs: 60_000, maxRequests: 500 }));

// ─── Health Checks ───────────────────────────────────────────
app.use("/api/health", healthRouter);

// ─── Metrics ─────────────────────────────────────────────────
app.use("/api/metrics", metricsRouter);

// Legacy health endpoint (redirects to new route)
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "slack-for-ai", port: PORT });
});

// ─── REST Route Mounting ────────────────────────────────────
app.use("/api/channels", channelsRouter);
app.use("/api/channels", messagesRouter);
app.use("/api/messages", reactionsRouter);

// ─── Membership Routes ──────────────────────────────
// GET    /api/channels/:channelId/members       - List members
// POST   /api/channels/:channelId/members       - Add member(s)
// PATCH  /api/channels/:channelId/members/:id   - Update member role
// DELETE /api/channels/:channelId/members/:id   - Remove member
// DELETE /api/channels/:channelId/members/me    - Leave channel
app.use("/api/channels", membershipsRouter);

// ─── WebSocket Server (Real-Time Messaging) ──────────────
const wss = new WebSocketServer({ noServer: true });

// channelConnections and wsMeta are imported from ./ws.ts

interface WSClientMessage {
  type: "join" | "message" | "typing" | "ping";
  channelId?: string;
  payload?: Record<string, unknown>;
}

/**
 * Upgrade HTTP requests to WebSocket.
 * Routes /ws upgrade requests to the WSS.
 */
httpServer.on("upgrade", (request, socket, head) => {
  const pathname = parse(request.url ?? "").pathname;
  if (pathname === "/ws") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on("connection", (ws, req) => {
  const meta = { connectedAt: new Date() };
  wsMeta.set(ws, meta);

  // Send connection acknowledgment
  ws.send(
    JSON.stringify({
      type: "connected",
      serverTime: new Date().toISOString(),
      socketId: uuidv4(),
    })
  );

  ws.on("message", (raw: Buffer) => {
    let msg: WSClientMessage;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      ws.send(
        JSON.stringify({ type: "error", message: "Invalid JSON payload" })
      );
      return;
    }

    const currentMeta = wsMeta.get(ws) ?? { connectedAt: new Date() };

    switch (msg.type) {
      case "join": {
        const channelId = msg.channelId;
        if (!channelId) {
          ws.send(
            JSON.stringify({ type: "error", message: "channelId required for join" })
          );
          return;
        }

        // Leave previous channel if any
        if (currentMeta.channelId) {
          const prev = channelConnections.get(currentMeta.channelId);
          if (prev) {
            prev.delete(ws);
          }
        }

        // Join new channel
        if (!channelConnections.has(channelId)) {
          channelConnections.set(channelId, new Set());
        }
        channelConnections.get(channelId)!.add(ws);
        wsMeta.set(ws, { ...currentMeta, channelId });

        ws.send(
          JSON.stringify({
            type: "joined",
            channelId,
            memberCount: channelConnections.get(channelId)!.size,
          })
        );
        break;
      }

      case "message": {
        // The client sends a message payload; the server broadcasts it
        // to all other subscribers of the same channel.
        // Note: actual persistence happens via REST POST /api/channels/:id/messages
        // This WS path is for real-time delivery of already-persisted messages
        // or for optimistic client updates.
        if (!currentMeta.channelId) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Not joined to any channel",
            })
          );
          return;
        }

        const broadcastMsg = JSON.stringify({
          type: "message",
          channelId: currentMeta.channelId,
          payload: msg.payload ?? {},
          timestamp: new Date().toISOString(),
        });

        const subscribers = channelConnections.get(currentMeta.channelId);
        if (subscribers) {
          for (const client of subscribers) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(broadcastMsg);
            }
          }
        }
        break;
      }

      case "typing": {
        if (!currentMeta.channelId) return;

        const typingMsg = JSON.stringify({
          type: "typing",
          channelId: currentMeta.channelId,
          payload: msg.payload ?? {},
        });

        const subscribers = channelConnections.get(currentMeta.channelId);
        if (subscribers) {
          for (const client of subscribers) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(typingMsg);
            }
          }
        }
        break;
      }

      case "ping": {
        ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
        break;
      }

      default:
        ws.send(
          JSON.stringify({ type: "error", message: `Unknown message type: ${msg.type}` })
        );
    }
  });

  ws.on("close", () => {
    const currentMeta = wsMeta.get(ws);
    if (currentMeta?.channelId) {
      const subscribers = channelConnections.get(currentMeta.channelId);
      if (subscribers) {
        subscribers.delete(ws);
        if (subscribers.size === 0) {
          channelConnections.delete(currentMeta.channelId);
        }
      }
    }
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err.message);
  });
});

// ─── Public API: broadcast helper ────────────────────────────
/**
 * Broadcast a message to all WebSocket clients subscribed to a channel.
 * Called by REST routes after persisting a new message.
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

  for (const client of subscribers) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

/**
 * Get connection stats for a channel.
 */
export function getChannelConnectionCount(channelId: string): number {
  return channelConnections.get(channelId)?.size ?? 0;
}

// ─── Error Handling ──────────────────────────────────────────
// 404 catch-all for unmatched API routes
app.use("/api/*", (_req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

// Global error handler (structured logging + correlation IDs)
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    const correlationId = (req as express.Request & { correlationId?: string }).correlationId;
    logger.errorEvent("Unhandled error", {
      errorId: `${Date.now()}`,
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      correlationId,
    });
    if (!res.headersSent) {
      res.status(500).json({
        error: "Internal server error",
        ...(correlationId ? { correlationId } : {}),
      });
    }
  }
);

// ─── Start Server ────────────────────────────────────────────
const server = httpServer.listen(PORT, () => {
  console.log(
    `Slack-for-AI server listening on port ${PORT} (HTTP + WS)`
  );
  console.log(`  REST API: http://localhost:${PORT}/api`);
  console.log(`  WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`  Health:    http://localhost:${PORT}/health`);
});

async function shutdown() {
  console.log("Shutting down...");

  // Close all WebSocket connections gracefully
  wss.clients.forEach((ws) => {
    ws.close(1001, "Server shutting down");
  });

  server.close();
  pool.end();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
