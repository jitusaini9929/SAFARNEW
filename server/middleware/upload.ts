import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';

// ── Upload base directory ──
// In production (VPS), use UPLOAD_DIR env var pointing to e.g. /var/www/safar/uploads
// In development, use a local ./uploads folder relative to the project root
const UPLOAD_BASE = process.env.UPLOAD_DIR || path.resolve(__dirname, '../../uploads');

// ── Per-type configuration ──
const CONFIGS: Record<string, {
  dir: string;
  width: number;
  height: number | null;
  quality: number;
  subfolder: string;
}> = {
  avatar: {
    dir: path.join(UPLOAD_BASE, 'avatars'),
    width: 256,
    height: 256,
    quality: 80,
    subfolder: 'avatars',
  },
  post: {
    dir: path.join(UPLOAD_BASE, 'posts'),
    width: 1200,
    height: null,      // maintain aspect ratio
    quality: 75,
    subfolder: 'posts',
  },
  general: {
    dir: path.join(UPLOAD_BASE, 'general'),
    width: 1200,
    height: null,
    quality: 80,
    subfolder: 'general',
  },
};

// ── Ensure directories exist ──
for (const config of Object.values(CONFIGS)) {
  if (!fs.existsSync(config.dir)) {
    fs.mkdirSync(config.dir, { recursive: true });
  }
}

// ── Multer (buffer mode — Sharp processes before writing to disk) ──
const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },  // 10MB raw limit
  fileFilter: (_req, file, cb) => {
    const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const ALLOWED_AUDIO = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac'];
    if (ALLOWED_IMAGE.includes(file.mimetype) || ALLOWED_AUDIO.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP, GIF images and MP3, WAV, OGG, M4A, AAC audio are allowed'));
    }
  },
});

// ── Sharp processing + save to disk ──
const processAndSave = (type: string) => async (req: Request, _res: Response, next: NextFunction) => {
  if (!req.file) return next();

  const config = CONFIGS[type] || CONFIGS.general;
  const isAudio = req.file.mimetype.startsWith('audio/');

  if (isAudio) {
    // Audio files: save directly to disk without Sharp processing
    const ext = req.file.originalname.split('.').pop() || 'mp3';
    const filename = `${uuidv4()}.${ext}`;
    const filepath = path.join(config.dir, filename);
    const urlPath = `/uploads/${config.subfolder}/${filename}`;

    try {
      fs.writeFileSync(filepath, req.file.buffer);
      (req as any).processedFile = { filename, filepath, urlPath };
      next();
    } catch (err) {
      next(err);
    }
    return;
  }

  // Image files: resize + convert to WebP via Sharp
  const filename = `${uuidv4()}.webp`;
  const filepath = path.join(config.dir, filename);
  const urlPath = `/uploads/${config.subfolder}/${filename}`;

  try {
    let sharpInstance = sharp(req.file.buffer);

    if (config.height) {
      // Cover crop (avatars)
      sharpInstance = sharpInstance.resize(config.width, config.height, {
        fit: 'cover',
        position: 'centre',
      });
    } else {
      // Width-only resize (posts/general)
      sharpInstance = sharpInstance.resize(config.width, null, {
        withoutEnlargement: true,
      });
    }

    await sharpInstance
      .webp({ quality: config.quality })
      .toFile(filepath);

    (req as any).processedFile = { filename, filepath, urlPath };
    next();
  } catch (err) {
    next(err);
  }
};

// ── Exported middleware chains ──
export const uploadAvatar = [multerUpload.single('avatar'), processAndSave('avatar')];
export const uploadPostImage = [multerUpload.single('image'), processAndSave('post')];
export const uploadGeneral = [multerUpload.single('file'), processAndSave('general')];

export { UPLOAD_BASE };
