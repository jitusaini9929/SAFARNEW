import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { pool } from "../db";
import { requireAuth } from "../middleware/auth";

export const uploadRoutes = Router();

// All upload routes require auth
uploadRoutes.use(requireAuth);

// ─────────────────────────────────────────────────────
// POST /api/upload
// Accepts base64 image data, stores in DB, returns URL
// ─────────────────────────────────────────────────────
uploadRoutes.post("/", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).session.userId!;
    const { data, mimeType } = req.body;

    if (!data || !mimeType) {
      return res.status(400).json({ success: false, message: "Missing data or mimeType" });
    }

    // Validate mime type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(mimeType)) {
      return res.status(400).json({ success: false, message: "Invalid image type. Allowed: JPEG, PNG, GIF, WebP" });
    }

    // Validate size (base64 is ~33% larger than binary, so 5MB binary ≈ 6.7MB base64)
    const sizeInBytes = Math.ceil((data.length * 3) / 4);
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB max
    if (sizeInBytes > maxSizeBytes) {
      return res.status(400).json({ success: false, message: "Image too large. Max 5MB." });
    }

    const imageId = uuidv4();

    await pool.query(
      `INSERT INTO uploaded_images (id, user_id, data, mime_type, size_bytes)
       VALUES ($1, $2, $3, $4, $5)`,
      [imageId, userId, data, mimeType, sizeInBytes]
    );

    const imageUrl = `/api/images/${imageId}`;

    res.json({ success: true, url: imageUrl, id: imageId });
  } catch (error: any) {
    console.error("❌ Image upload failed:", error);
    res.status(500).json({ success: false, message: "Upload failed" });
  }
});

// ─────────────────────────────────────────────────────
// GET /api/images/:id
// Serves a stored image by ID (public - no auth needed)
// ─────────────────────────────────────────────────────
export const imageServeRouter = Router();

imageServeRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT data, mime_type FROM uploaded_images WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Image not found" });
    }

    const { data, mime_type } = result.rows[0];

    // Convert base64 back to buffer
    const imageBuffer = Buffer.from(data, "base64");

    // Set cache headers (images don't change)
    res.set({
      "Content-Type": mime_type,
      "Content-Length": imageBuffer.length.toString(),
      "Cache-Control": "public, max-age=31536000, immutable",
    });

    res.send(imageBuffer);
  } catch (error: any) {
    console.error("❌ Image serve failed:", error);
    res.status(500).json({ message: "Failed to serve image" });
  }
});
