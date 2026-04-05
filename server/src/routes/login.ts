import { Router, Request, Response } from "express";
import { db, authUsers } from "../db.js";
import { eq } from "drizzle-orm";
import { generateUserToken } from "../middleware/auth.js";

const router = Router();

// POST /api/auth/login — dev login (no password)
router.post("/login", async (req: Request, res: Response) => {
  const { username } = req.body;
  if (!username || typeof username !== "string") {
    res.status(400).json({ error: "username is required" });
    return;
  }

  const users = await db
    .select()
    .from(authUsers)
    .where(eq(authUsers.id, username))
    .limit(1);

  if (users.length === 0) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const user = users[0];
  // Use the first company — in dev there's only one
  const companyId = "91d80478-1fd3-4025-8ec1-5bf3aed65665";
  const token = generateUserToken(user.id, companyId);

  res.json({
    token,
    user: { id: user.id, name: user.name },
  });
});

// GET /api/auth/me — get current user info
router.get("/me", async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  // Just decode without full middleware chain
  try {
    const jwt = await import("jsonwebtoken");
    const secret = process.env.JWT_SECRET || "slack-for-ai-dev-secret";
    const decoded = jwt.default.verify(authHeader.slice(7), secret) as {
      sub: string;
      companyId: string;
    };
    const users = await db
      .select()
      .from(authUsers)
      .where(eq(authUsers.id, decoded.sub))
      .limit(1);
    if (users.length === 0) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    res.json({ id: users[0].id, name: users[0].name });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
