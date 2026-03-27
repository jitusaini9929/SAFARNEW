import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required Vultr Object Storage env var: ${name}`);
  }
  return value;
}

function getStorageSettings() {
  const endpoint = trimTrailingSlash(readRequiredEnv('VULTR_ENDPOINT'));
  const bucket = readRequiredEnv('VULTR_BUCKET_NAME');

  return {
    endpoint,
    bucket,
    region: readRequiredEnv('VULTR_BUCKET_REGION'),
    accessKeyId: readRequiredEnv('VULTR_ACCESS_KEY'),
    secretAccessKey: readRequiredEnv('VULTR_SECRET_KEY'),
    publicBaseUrl: trimTrailingSlash(
      process.env.VULTR_PUBLIC_BASE_URL?.trim() || `${endpoint}/${bucket}`,
    ),
  };
}

let storageClient: S3Client | null = null;

function getStorageClient(): S3Client {
  if (storageClient) {
    return storageClient;
  }

  const settings = getStorageSettings();
  storageClient = new S3Client({
    endpoint: settings.endpoint,
    region: settings.region,
    credentials: {
      accessKeyId: settings.accessKeyId,
      secretAccessKey: settings.secretAccessKey,
    },
    forcePathStyle: true,
  });

  return storageClient;
}

function buildPublicUrl(objectKey: string): string {
  return `${getStorageSettings().publicBaseUrl}/${objectKey}`;
}

function getAudioExtension(file: Express.Multer.File): string {
  const originalExtension = path.extname(file.originalname).replace(/^\./, '').toLowerCase();
  if (originalExtension) {
    return originalExtension;
  }

  const mimeSubtype = file.mimetype.split('/')[1]?.toLowerCase() || 'bin';
  if (mimeSubtype === 'mpeg') return 'mp3';
  if (mimeSubtype === 'mp4') return 'm4a';
  return mimeSubtype;
}

const CONFIGS: Record<string, {
  width: number;
  height: number | null;
  quality: number;
  folder: string;
}> = {
  avatar: {
    width: 256,
    height: 256,
    quality: 80,
    folder: 'avatars',
  },
  post: {
    width: 1200,
    height: null,
    quality: 75,
    folder: 'posts',
  },
  general: {
    width: 1200,
    height: null,
    quality: 80,
    folder: 'general',
  },
};

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    const allowedImage = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const allowedAudio = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac'];

    if (allowedImage.includes(file.mimetype) || allowedAudio.includes(file.mimetype)) {
      cb(null, true);
      return;
    }

    cb(new Error('Only JPEG, PNG, WebP, GIF images and MP3, WAV, OGG, M4A, AAC audio are allowed'));
  },
});

const processAndSave = (type: string) => async (req: Request, _res: Response, next: NextFunction) => {
  if (!req.file) return next();

  const config = CONFIGS[type] || CONFIGS.general;
  const { bucket } = getStorageSettings();
  const isAudio = req.file.mimetype.startsWith('audio/');

  if (isAudio) {
    const ext = getAudioExtension(req.file);
    const filename = `${uuidv4()}.${ext}`;
    const objectKey = `${config.folder}/${filename}`;
    const urlPath = buildPublicUrl(objectKey);

    try {
      await getStorageClient().send(new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
        ACL: 'public-read',
      }));

      (req as any).processedFile = { filename, objectKey, urlPath };
      next();
    } catch (err) {
      next(err);
    }
    return;
  }

  const filename = `${uuidv4()}.webp`;
  const objectKey = `${config.folder}/${filename}`;
  const urlPath = buildPublicUrl(objectKey);

  try {
    let sharpInstance = sharp(req.file.buffer);

    if (config.height) {
      sharpInstance = sharpInstance.resize(config.width, config.height, {
        fit: 'cover',
        position: 'centre',
      });
    } else {
      sharpInstance = sharpInstance.resize(config.width, null, {
        withoutEnlargement: true,
      });
    }

    const webpBuffer = await sharpInstance
      .webp({ quality: config.quality })
      .toBuffer();

    await getStorageClient().send(new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: webpBuffer,
      ContentType: 'image/webp',
      ACL: 'public-read',
    }));

    (req as any).processedFile = { filename, objectKey, urlPath };
    next();
  } catch (err) {
    next(err);
  }
};

export const uploadAvatar = [multerUpload.single('avatar'), processAndSave('avatar')];
export const uploadPostImage = [multerUpload.single('image'), processAndSave('post')];
export const uploadGeneral = [multerUpload.single('file'), processAndSave('general')];
