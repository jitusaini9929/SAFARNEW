import '../load-env';
import path from 'path';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { connectMongo, getDb } from '../db';

type TargetField = {
  collection: string;
  field: string;
};

type LegacyBlob = {
  id: string;
  data: string;
  mime_type: string;
};

type ScriptConfig = {
  dryRun: boolean;
  limit: number | null;
  includeCollections: Set<string> | null;
};

const TARGET_FIELDS: TargetField[] = [
  { collection: 'users', field: 'avatar' },
  { collection: 'sandesh_messages', field: 'image_url' },
  { collection: 'sandesh_messages', field: 'audio_url' },
  { collection: 'mehfil_thoughts', field: 'image_url' },
];

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

function mimeToExtension(mimeType: string): string {
  const normalized = String(mimeType || '').toLowerCase();

  switch (normalized) {
    case 'image/webp':
      return 'webp';
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/gif':
      return 'gif';
    case 'audio/mpeg':
      return 'mp3';
    case 'audio/wav':
      return 'wav';
    case 'audio/ogg':
      return 'ogg';
    case 'audio/mp4':
      return 'm4a';
    case 'audio/aac':
      return 'aac';
    default:
      return 'bin';
  }
}

function getObjectKey(imageId: string, mimeType: string): string {
  const topLevel = String(mimeType || '').startsWith('audio/') ? 'audio' : 'image';
  return `legacy/${topLevel}/${imageId}.${mimeToExtension(mimeType)}`;
}

function buildPublicUrl(objectKey: string): string {
  const settings = getStorageSettings();
  return `${settings.publicBaseUrl}/${objectKey}`;
}

function extractLegacyImageId(value: string): string | null {
  const normalized = String(value || '').trim();
  const match = normalized.match(/\/api\/images\/([a-zA-Z0-9-]+)/i);
  return match ? match[1] : null;
}

function parseScriptConfig(argv: string[]): ScriptConfig {
  const dryRun = !argv.includes('--apply');

  const limitArg = argv.find((arg) => arg.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : null;
  const normalizedLimit = Number.isFinite(limit) && limit! > 0 ? Math.floor(limit!) : null;

  const collectionsArg = argv.find((arg) => arg.startsWith('--collections='));
  const includeCollections = collectionsArg
    ? new Set(
        collectionsArg
          .split('=')[1]
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean),
      )
    : null;

  return {
    dryRun,
    limit: normalizedLimit,
    includeCollections,
  };
}

async function main() {
  const config = parseScriptConfig(process.argv.slice(2));
  const storageSettings = getStorageSettings();
  const storageClient = createStorageClient();

  console.log(`[backfill-legacy-images] Mode: ${config.dryRun ? 'DRY RUN' : 'APPLY'}`);
  console.log(`[backfill-legacy-images] Bucket: ${storageSettings.bucket}`);
  if (config.limit) {
    console.log(`[backfill-legacy-images] Global limit: ${config.limit}`);
  }

  await connectMongo();
  const db = getDb();

  const imageCollection = db.collection<LegacyBlob>('uploaded_images');

  let remaining = config.limit;
  let scannedDocs = 0;
  let matchedLegacyReferences = 0;
  let updatedReferences = 0;
  let skippedInvalidUrl = 0;
  let missingLegacyBlobs = 0;
  let uploadedObjects = 0;
  let reusedUploads = 0;
  let failures = 0;

  const sourceBlobCache = new Map<string, LegacyBlob | null>();
  const migratedUrlCache = new Map<string, string>();

  for (const target of TARGET_FIELDS) {
    if (remaining === 0) break;
    if (config.includeCollections && !config.includeCollections.has(target.collection)) {
      continue;
    }

    const collection = db.collection<any>(target.collection);
    const query = { [target.field]: { $regex: '/api/images/' } };
    const projection = { _id: 1, id: 1, [target.field]: 1 } as Record<string, number>;
    let cursor = collection.find(query, { projection });

    if (remaining && remaining > 0) {
      cursor = cursor.limit(remaining);
    }

    console.log(`[backfill-legacy-images] Scanning ${target.collection}.${target.field}`);

    for await (const doc of cursor) {
      if (remaining === 0) break;

      scannedDocs += 1;
      const currentValue = String(doc?.[target.field] || '');
      const legacyId = extractLegacyImageId(currentValue);

      if (!legacyId) {
        skippedInvalidUrl += 1;
        continue;
      }

      matchedLegacyReferences += 1;

      let blob = sourceBlobCache.get(legacyId) ?? null;
      if (!sourceBlobCache.has(legacyId)) {
        blob = await imageCollection.findOne({ id: legacyId }, { projection: { _id: 0, id: 1, data: 1, mime_type: 1 } });
        sourceBlobCache.set(legacyId, blob ?? null);
      }

      if (!blob) {
        missingLegacyBlobs += 1;
        continue;
      }

      let nextUrl = migratedUrlCache.get(legacyId);
      if (!nextUrl) {
        const objectKey = getObjectKey(legacyId, blob.mime_type);
        nextUrl = buildPublicUrl(objectKey);

        if (!config.dryRun) {
          const body = Buffer.from(blob.data, 'base64');
          await storageClient.send(
            new PutObjectCommand({
              Bucket: storageSettings.bucket,
              Key: objectKey,
              Body: body,
              ContentType: blob.mime_type,
              ACL: 'public-read',
            }),
          );
        }

        uploadedObjects += 1;
        migratedUrlCache.set(legacyId, nextUrl);
      } else {
        reusedUploads += 1;
      }

      try {
        if (!config.dryRun) {
          await collection.updateOne({ _id: doc._id }, { $set: { [target.field]: nextUrl } });
        }
        updatedReferences += 1;
      } catch (error) {
        failures += 1;
        console.error('[backfill-legacy-images] Failed updating document reference', {
          collection: target.collection,
          field: target.field,
          docId: String(doc?._id),
          legacyId,
          error,
        });
      }

      if (remaining && remaining > 0) {
        remaining -= 1;
      }
    }
  }

  console.log('[backfill-legacy-images] Summary');
  console.log(`  scannedDocs: ${scannedDocs}`);
  console.log(`  matchedLegacyReferences: ${matchedLegacyReferences}`);
  console.log(`  updatedReferences: ${updatedReferences}`);
  console.log(`  skippedInvalidUrl: ${skippedInvalidUrl}`);
  console.log(`  missingLegacyBlobs: ${missingLegacyBlobs}`);
  console.log(`  uploadedObjects: ${uploadedObjects}`);
  console.log(`  reusedUploads: ${reusedUploads}`);
  console.log(`  failures: ${failures}`);

  if (config.dryRun) {
    console.log('[backfill-legacy-images] Dry run complete. Re-run with --apply to persist changes.');
  }
}

main().catch((error) => {
  console.error('[backfill-legacy-images] Failed:', error);
  process.exit(1);
});
