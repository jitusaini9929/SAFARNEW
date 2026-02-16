import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { collections } from "../db";
import { requireAuth } from "../middleware/auth";

export const uploadRoutes = Router();

uploadRoutes.use(requireAuth);

// POST /api/upload
uploadRoutes.post("/", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).session.userId!;
    const { data, mimeType } = req.body;

    if (!data || !mimeType) {
      return res.status(400).json({ success: false, message: "Missing data or mimeType" });
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "audio/mpeg",
      "audio/wav",
      "audio/ogg",
      "audio/mp4",
      "audio/aac",
    ];
    if (!allowedTypes.includes(mimeType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid file type. Allowed: Images & Audio (MP3, WAV, OGG, M4A, AAC)",
      });
    }

    const sizeInBytes = Math.ceil((data.length * 3) / 4);
    const maxSizeBytes = 5 * 1024 * 1024;
    if (sizeInBytes > maxSizeBytes) {
      return res.status(400).json({ success: false, message: "Image too large. Max 5MB." });
    }

    const imageId = uuidv4();

    await collections.uploadedImages().insertOne({
      id: imageId,
      user_id: userId,
      data,
      mime_type: mimeType,
      size_bytes: sizeInBytes,
      created_at: new Date(),
    });

    const imageUrl = `/api/images/${imageId}`;
    res.json({ success: true, url: imageUrl, id: imageId });
  } catch (error: any) {
    console.error("❌ Image upload failed:", error);
    res.status(500).json({ success: false, message: "Upload failed" });
  }
});

// GET /api/images/:id
export const imageServeRouter = Router();

imageServeRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const image = await collections.uploadedImages().findOne({ id });

    if (!image) {
      return res.status(404).json({ message: "Image not found" });
    }

    const imageBuffer = Buffer.from(image.data, "base64");

    res.set({
      "Content-Type": image.mime_type,
      "Content-Length": imageBuffer.length.toString(),
      "Cache-Control": "public, max-age=31536000, immutable",
    });

    res.send(imageBuffer);
  } catch (error: any) {
    console.error("❌ Image serve failed:", error);
    res.status(500).json({ message: "Failed to serve image" });
  }
});
