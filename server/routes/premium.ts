import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { canUseMehfilDm } from "../lib/premium-features";

export const premiumRoutes = Router();

premiumRoutes.use(requireAuth);

premiumRoutes.get("/features", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const mehfilDm = await canUseMehfilDm(userId);
    return res.json({ mehfilDm });
  } catch (error) {
    console.error("[PREMIUM] Failed to fetch feature entitlements:", error);
    return res.status(500).json({ message: "Failed to fetch premium features" });
  }
});
