import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { canUseMehfilDm } from "../lib/premium-features";
import { collections } from "../db";

export const premiumRoutes = Router();

premiumRoutes.use(requireAuth);

premiumRoutes.get("/status", async (req: any, res: Response) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const entitlement = await collections.premiumEntitlements().findOne({ userId });

    if (entitlement && entitlement.isActive && entitlement.expiresAt > new Date()) {
      return res.json({
        success: true,
        isPremium: true,
        planType: entitlement.planType,
        expiresAt: entitlement.expiresAt.toISOString(),
        features: {
          mehfilDm: true,
          studyPlannerInsights: true,
          nishthaAnalytics: true,
          focusAnalytics: true
        }
      });
    }

    return res.json({
      success: true,
      isPremium: false,
      planType: null,
      expiresAt: null,
      features: {
        mehfilDm: false,
        studyPlannerInsights: false,
        nishthaAnalytics: false,
        focusAnalytics: false
      }
    });

  } catch (error) {
    console.error("[PREMIUM] Failed to fetch premium status:", error);
    return res.status(500).json({ message: "Failed to fetch premium status" });
  }
});

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
