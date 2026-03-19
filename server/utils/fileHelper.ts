import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LEGACY_UPLOAD_BASE = process.env.UPLOAD_DIR || path.resolve(__dirname, '../../uploads');

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

async function deleteLegacyDiskFile(oldUrlPath: string): Promise<void> {
  const relativePart = oldUrlPath.replace(/^\/uploads\//, '');
  const absolutePath = path.join(LEGACY_UPLOAD_BASE, relativePart);

  const resolvedBase = path.resolve(LEGACY_UPLOAD_BASE);
  const resolvedTarget = path.resolve(absolutePath);
  if (!resolvedTarget.startsWith(resolvedBase)) return;

  try {
    await fs.promises.unlink(absolutePath);
  } catch (err: any) {
    if (err?.code !== 'ENOENT') {
      console.error(`[fileHelper] Failed to delete ${absolutePath}:`, err.message);
    }
  }
}

function extractObjectKey(oldUrl: string): string | null {
  const parsedUrl = new URL(oldUrl);
  const normalizedPath = parsedUrl.pathname.replace(/^\/+/, '');
  const { bucket, publicBaseUrl } = getStorageSettings();

  const publicBase = new URL(publicBaseUrl);
  const publicBaseHost = `${publicBase.protocol}//${publicBase.host}`;
  const candidateHost = `${parsedUrl.protocol}//${parsedUrl.host}`;
  const publicBasePath = publicBase.pathname.replace(/^\/+|\/+$/g, '');

  if (candidateHost === publicBaseHost) {
    if (!publicBasePath) {
      return normalizedPath || null;
    }

    if (normalizedPath.startsWith(`${publicBasePath}/`)) {
      return normalizedPath.slice(publicBasePath.length + 1);
    }
  }

  if (normalizedPath.startsWith(`${bucket}/`)) {
    return normalizedPath.slice(bucket.length + 1);
  }

  return null;
}

export async function deleteOldFile(oldUrlPath: string | null | undefined): Promise<void> {
  if (!oldUrlPath) return;

  if (oldUrlPath.startsWith('/uploads/')) {
    await deleteLegacyDiskFile(oldUrlPath);
    return;
  }

  if (!/^https?:\/\//i.test(oldUrlPath)) {
    return;
  }

  try {
    const { bucket } = getStorageSettings();
    const objectKey = extractObjectKey(oldUrlPath);
    if (!objectKey) {
      return;
    }

    await getStorageClient().send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: objectKey,
    }));
  } catch (err: any) {
    console.error('[fileHelper] Object storage delete failed:', err?.message || err);
  }
}
