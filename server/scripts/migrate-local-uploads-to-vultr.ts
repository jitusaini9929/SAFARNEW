import '../load-env';
import fs from 'fs/promises';
import path from 'path';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { connectMongo, collections } from '../db';

const LEGACY_UPLOAD_BASE = process.env.UPLOAD_DIR || path.resolve(__dirname, '../../uploads');
const FOLDERS = ['avatars', 'posts', 'general'] as const;

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
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

function createStorageClient(): S3Client {
  const settings = getStorageSettings();
  return new S3Client({
    endpoint: settings.endpoint,
    region: settings.region,
    credentials: {
      accessKeyId: settings.accessKeyId,
      secretAccessKey: settings.secretAccessKey,
    },
    forcePathStyle: true,
  });
}

function buildPublicUrl(relativePath: string): string {
  return `${getStorageSettings().publicBaseUrl}/${relativePath.replace(/\\/g, '/')}`;
}

function guessContentType(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case '.webp':
      return 'image/webp';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.mp3':
      return 'audio/mpeg';
    case '.wav':
      return 'audio/wav';
    case '.ogg':
      return 'audio/ogg';
    case '.m4a':
    case '.mp4':
      return 'audio/mp4';
    case '.aac':
      return 'audio/aac';
    default:
      return 'application/octet-stream';
  }
}

async function listFilesRecursively(rootDir: string): Promise<string[]> {
  let entries: Array<{ name: string; isDirectory(): boolean; isFile(): boolean }>;

  try {
    entries = await fs.readdir(rootDir, { withFileTypes: true });
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      return [];
    }
    throw err;
  }

  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      return listFilesRecursively(fullPath);
    }

    if (entry.isFile()) {
      return [fullPath];
    }

    return [];
  }));

  return files.flat();
}

async function uploadLegacyFiles(): Promise<{ uploaded: number; skipped: number }> {
  const settings = getStorageSettings();
  const storageClient = createStorageClient();
  let uploaded = 0;
  let skipped = 0;

  for (const folder of FOLDERS) {
    const folderPath = path.join(LEGACY_UPLOAD_BASE, folder);
    const files = await listFilesRecursively(folderPath);

    if (files.length === 0) {
      console.log(`[migrate-uploads] No files found in ${folderPath}`);
      continue;
    }

    console.log(`[migrate-uploads] Uploading ${files.length} files from ${folderPath}`);

    for (const filePath of files) {
      const relativePath = path.relative(LEGACY_UPLOAD_BASE, filePath).replace(/\\/g, '/');
      if (!relativePath || relativePath.startsWith('..')) {
        skipped += 1;
        continue;
      }

      const body = await fs.readFile(filePath);
      await storageClient.send(new PutObjectCommand({
        Bucket: settings.bucket,
        Key: relativePath,
        Body: body,
        ContentType: guessContentType(filePath),
        ACL: 'public-read',
      }));
      uploaded += 1;
    }
  }

  return { uploaded, skipped };
}

async function rewriteAvatarUrls(): Promise<number> {
  const users = await collections.users()
    .find(
      { avatar: { $regex: '^/uploads/' } },
      { projection: { id: 1, avatar: 1 } },
    )
    .toArray();

  if (users.length === 0) {
    console.log('[migrate-uploads] No Mongo avatar URLs need rewriting.');
    return 0;
  }

  let updated = 0;

  for (const user of users) {
    const currentAvatar = String(user.avatar || '');
    const relativePath = currentAvatar.replace(/^\/uploads\//, '');
    const nextAvatar = buildPublicUrl(relativePath);

    await collections.users().updateOne(
      { id: user.id },
      { $set: { avatar: nextAvatar } },
    );
    updated += 1;
  }

  return updated;
}

async function main() {
  console.log(`[migrate-uploads] Legacy upload directory: ${LEGACY_UPLOAD_BASE}`);
  console.log(`[migrate-uploads] Vultr bucket: ${getStorageSettings().bucket}`);

  await connectMongo();

  const { uploaded, skipped } = await uploadLegacyFiles();
  const updatedAvatars = await rewriteAvatarUrls();

  console.log(`[migrate-uploads] Uploaded files: ${uploaded}`);
  console.log(`[migrate-uploads] Skipped files: ${skipped}`);
  console.log(`[migrate-uploads] Updated avatar URLs in Mongo: ${updatedAvatars}`);
  console.log('[migrate-uploads] Done. Do not delete the old uploads folder until you verify the new URLs in production.');
}

main().catch((err) => {
  console.error('[migrate-uploads] Failed:', err);
  process.exit(1);
});
