import { Router, Request, Response } from "express";
import { db, agents } from "../db.js";
import { eq } from "drizzle-orm";
import { authenticate, requireCompany } from "../middleware/auth.js";
import { paramStr, asyncHandler } from "../utils/helpers.js";
import { COMPANY_ID } from "../config.js";

const router = Router();

// Apply auth middleware to all routes
router.use(authenticate);
router.use(requireCompany(COMPANY_ID));

// GET /api/agents - List all agents in the company
router.get(
  "/",
  asyncHandler(async (_req: Request, res: Response) => {
    const results = await db
      .select({
        id: agents.id,
        name: agents.name,
        keyName: agents.keyName,
      })
      .from(agents)
      .where(eq(agents.companyId, COMPANY_ID));

    res.json(results);
  })
);

// GET /api/agents/:id - Get a specific agent
router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const id = paramStr(req, "id");

    const results = await db
      .select({
        id: agents.id,
        name: agents.name,
        keyName: agents.keyName,
      })
      .from(agents)
      .where(eq(agents.id, id))
      .limit(1);

    if (results.length === 0) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }

    res.json(results[0]);
  })
);

export default router;
