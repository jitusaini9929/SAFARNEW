import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { collections } from "../db";
import { requireAuth } from "../middleware/auth";
import { uploadAvatar, uploadGeneral } from "../middleware/upload";
import { deleteOldFile } from "../utils/fileHelper";

export const uploadRoutes = Router();

uploadRoutes.use(requireAuth);

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/upload/avatar — Upload or replace user avatar (multipart/form-data)
// ──────────────────────────────────────────────────────────────────────────────
uploadRoutes.post("/avatar", ...uploadAvatar, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const processedFile = (req as any).processedFile;

    if (!processedFile) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    // Get current avatar so the old asset can be cleaned up after replacement
    const user = await collections.users().findOne(
      { id: userId },
      { projection: { avatar: 1 } }
    );

    await deleteOldFile(user?.avatar);

    // Save only the public URL to MongoDB
    await collections.users().updateOne(
      { id: userId },
      { $set: { avatar: processedFile.urlPath } }
    );

    return res.json({
      success: true,
      url: processedFile.urlPath,
    });
  } catch (error: any) {
    console.error("❌ Avatar upload failed:", error);
    return res.status(500).json({ success: false, message: "Upload failed" });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/upload — General file upload (backward compatible)
// Accepts EITHER:
//   • multipart/form-data with field "file" (new disk-based path)
//   • JSON body with { data, mimeType } (legacy base64 path — kept for audio in Sandesh)
// ──────────────────────────────────────────────────────────────────────────────
uploadRoutes.post("/", ...uploadGeneral, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const processedFile = (req as any).processedFile;

    // ── New path: multipart/form-data upload was processed by multer+sharp ──
    if (processedFile) {
      return res.json({
        success: true,
        url: processedFile.urlPath,
        id: processedFile.filename,
      });
    }

    // ── Legacy path: JSON body with base64 data (kept for backward compat) ──
    const { data, mimeType } = req.body;

    if (!data || !mimeType) {
      return res.status(400).json({ success: false, message: "Missing data or mimeType" });
    }

    const allowedTypes = [
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4", "audio/aac",
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
      return res.status(400).json({ success: false, message: "File too large. Max 5MB." });
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
    console.error("❌ Upload failed:", error);
    res.status(500).json({ success: false, message: "Upload failed" });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/images/:id — Serve images from MongoDB (legacy base64 storage)
// ──────────────────────────────────────────────────────────────────────────────
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
