/**
 * Mobile Upload Routes — multipart/form-data file upload for Android.
 *
 * Mounted at: /api/mobile
 *
 * POST /upload  - Upload image or audio as real binary (multipart/form-data).
 *                 Storage: same uploaded_images MongoDB collection as the web.
 *                 Response: { success, url, id } — identical shape to /api/upload.
 *
 * Field name:  "file" (single file only)
 * Max size:    5 MB
 * Allowed types: image/jpeg, image/png, image/gif, image/webp,
 *                audio/mpeg, audio/wav, audio/ogg, audio/mp4, audio/aac
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { collections } from '../db';
import { requireAuthMobile } from '../middleware/auth';

const router = Router();

const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/mp4',
    'audio/aac',
    'audio/x-m4a',
]);

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

// Use memory storage — we convert buffer → base64 before saving to MongoDB
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_SIZE_BYTES },
    fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Unsupported file type: ${file.mimetype}`));
        }
    },
});

// ─── POST /api/mobile/upload ──────────────────────────────────────────────────

router.post(
    '/upload',
    requireAuthMobile,
    upload.single('file'),
    async (req: Request, res: Response) => {
        const userId = (req.session as any).userId as string;

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded. Use field name "file".' });
        }

        const { buffer, mimetype, size } = req.file;

        // Convert binary buffer → base64 (same storage format as web upload)
        const base64Data = buffer.toString('base64');
        const imageId = uuidv4();

        try {
            await collections.uploadedImages().insertOne({
                id: imageId,
                user_id: userId,
                data: base64Data,
                mime_type: mimetype,
                size_bytes: size,
                created_at: new Date(),
            });

            return res.status(201).json({
                success: true,
                url: `/api/images/${imageId}`,
                id: imageId,
            });
        } catch (err) {
            console.error('[MOBILE-UPLOAD] Error saving file:', err);
            return res.status(500).json({ message: 'Failed to save file' });
        }
    }
);

// ─── Multer error handler (file too large / wrong type) ───────────────────────
router.use((err: any, _req: Request, res: Response, _next: any) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ message: 'File too large. Maximum size is 5 MB.' });
        }
        return res.status(400).json({ message: err.message });
    }
    if (err?.message?.startsWith('Unsupported file type')) {
        return res.status(415).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Upload error' });
});

export const mobileUploadRoutes = router;
