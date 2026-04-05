/**
 * File Upload Routes
 *
 * Endpoints:
 *   POST   /api/channels/:channelId/upload   - Upload a file to a channel
 *   GET    /api/files/:fileId                - Get file metadata
 *   GET    /api/files/:fileId/download       - Download file
 *   DELETE /api/files/:fileId                - Delete file
 *   GET    /api/channels/:channelId/files    - List files in channel
 */
import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import {
  db,
  channels,
  channelMemberships,
  fileAttachments,
} from "../db.js";
import { eq, and, isNull, desc } from "drizzle-orm";
import { authenticate, requireCompany } from "../middleware/auth.js";
import { logActivity, paramStr, asyncHandler } from "../utils/helpers.js";
import { existsSync, createReadStream, mkdirSync, unlinkSync } from "fs";
import { join } from "path";
import { COMPANY_ID } from "../config.js";

const router = Router();
router.use(authenticate);
router.use(requireCompany(COMPANY_ID));

// Configure local storage for uploaded files
const UPLOAD_DIR = join(process.cwd(), "uploads");
mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = file.originalname.split(".").pop() || "";
    const id = uuidv4();
    cb(null, ext ? `${id}.${ext}` : id);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 5,
  },
});

router.use(authenticate);
router.use(requireCompany(COMPANY_ID));

// --- Upload file to a channel ---
router.post("/channels/:channelId/upload", upload.single("file"), async (req, res) => {
  try {
    const actor = req.actor!;
    const channelId = String(req.params.channelId);

    const channel = await db.query.channels.findFirst({
      where: and(eq(channels.id, channelId), isNull(channels.deletedAt)),
    });

    if (!channel) {
      return res.status(404).json({ error: "Channel not found" });
    }
    if (channel.archived) {
      return res.status(400).json({ error: "Cannot upload to archived channel" });
    }

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
      return res.status(403).json({ error: "You must be a member of the channel to upload" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const file = req.file;
    const ext = file.originalname.split(".").pop() || "";

    const [attachment] = await db
      .insert(fileAttachments)
      .values({
        channelId,
        filename: file.originalname,
        storedName: file.filename,
        mimeType: file.mimetype ?? "application/octet-stream",
        sizeBytes: file.size,
        extension: ext || null,
        uploadedByAgentId: actor.kind === "agent" ? actor.id : null,
        uploadedByUserId: actor.kind === "user" ? actor.id : null,
      } as unknown as typeof fileAttachments.$inferInsert)
      .returning();

    await logActivity({
      companyId: COMPANY_ID,
      actor,
      action: "file.uploaded",
      entityType: "file",
      entityId: attachment.id,
      details: { filename: file.originalname, sizeBytes: file.size, channelId },
    });

    res.status(201).json({
      id: attachment.id,
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      downloadUrl: `/api/files/${attachment.id}/download`,
      channelId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: "Failed to upload file", detail: message });
  }
});

// --- Get file metadata ---
router.get("/files/:fileId", async (req, res) => {
  try {
    const file = await db.query.fileAttachments.findFirst({
      where: eq(fileAttachments.id, String(req.params.fileId)),
    });
    if (!file || file.deletedAt) {
      return res.status(404).json({ error: "File not found" });
    }
    res.json({
      id: file.id,
      filename: file.filename,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      extension: file.extension,
      createdAt: file.createdAt,
      downloadUrl: `/api/files/${file.id}/download`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: "Failed to get file metadata", detail: message });
  }
});

// --- Download file ---
router.get("/files/:fileId/download", async (req, res) => {
  try {
    const file = await db.query.fileAttachments.findFirst({
      where: eq(fileAttachments.id, String(req.params.fileId)),
    });
    if (!file || file.deletedAt) {
      return res.status(404).json({ error: "File not found" });
    }
    const filePath = join(UPLOAD_DIR, file.storedName);
    if (!existsSync(filePath)) {
      return res.status(404).json({ error: "File content not found" });
    }
    res.set({
      "Content-Type": file.mimeType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(file.filename)}"`,
      "Content-Length": String(file.sizeBytes),
    });
    createReadStream(filePath).pipe(res);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: "Failed to download file", detail: message });
  }
});

// --- Delete file ---
router.delete("/files/:fileId", async (req, res) => {
  try {
    const actor = req.actor!;
    const fileId = String(req.params.fileId);

    const file = await db.query.fileAttachments.findFirst({
      where: eq(fileAttachments.id, fileId),
    });
    if (!file) return res.status(404).json({ error: "File not found" });

    const membership = await db.query.channelMemberships.findFirst({
      where: and(
        eq(channelMemberships.channelId, file.channelId),
        actor.kind === "agent"
          ? eq(channelMemberships.agentId, actor.id)
          : eq(channelMemberships.userId, actor.id),
        isNull(channelMemberships.leftAt)
      ),
    });
    if (!membership) return res.status(403).json({ error: "Access denied" });

    const isOwner =
      (actor.kind === "agent" && file.uploadedByAgentId === actor.id) ||
      (actor.kind === "user" && file.uploadedByUserId === actor.id);

    if (membership.role !== "admin" && !isOwner) {
      return res.status(403).json({ error: "Only admins or the file owner can delete" });
    }

    const deleteData = { deletedAt: new Date() };
    await db.update(fileAttachments).set(deleteData as unknown as typeof fileAttachments.$inferInsert).where(eq(fileAttachments.id, fileId));

    // Attempt to delete the physical file
    try {
      const filePath = join(UPLOAD_DIR, file.storedName);
      if (existsSync(filePath)) unlinkSync(filePath);
    } catch { /* ignore physical deletion errors */ }

    await logActivity({
      companyId: COMPANY_ID,
      actor,
      action: "file.deleted",
      entityType: "file",
      entityId: fileId,
      details: { filename: file.filename },
    });
    res.json({ success: true, message: "File deleted" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: "Failed to delete file", detail: message });
  }
});

// --- List files in a channel ---
router.get("/channels/:channelId/files", async (req, res) => {
  try {
    const channelId = String(req.params.channelId);
    const channel = await db.query.channels.findFirst({
      where: and(eq(channels.id, channelId), isNull(channels.deletedAt)),
    });
    if (!channel) return res.status(404).json({ error: "Channel not found" });

    const files = await db.query.fileAttachments.findMany({
      where: and(
        eq(fileAttachments.channelId, channelId),
        isNull(fileAttachments.deletedAt)
      ),
      orderBy: [desc(fileAttachments.createdAt)],
      columns: {
        id: true,
        filename: true,
        mimeType: true,
        sizeBytes: true,
        extension: true,
        createdAt: true,
      },
    });
    res.json({ files });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: "Failed to list files", detail: message });
  }
});

// --- Error handler for multer ---
router.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof Error && err.message.includes("multer")) {
    if (err.message.includes("LIMIT_FILE_SIZE")) {
      return res.status(413).json({ error: "File too large. Maximum size is 50MB" });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  _next(err);
});

export default router;
