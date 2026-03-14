import fs from 'fs';
import path from 'path';

const UPLOAD_BASE = process.env.UPLOAD_DIR || path.resolve(__dirname, '../../uploads');

/**
 * Deletes the old file from disk when a user replaces their image.
 * @param oldUrlPath - e.g. "/uploads/avatars/abc.webp"
 */
export function deleteOldFile(oldUrlPath: string | null | undefined): void {
  if (!oldUrlPath) return;

  // Only process paths that start with /uploads/
  if (!oldUrlPath.startsWith('/uploads/')) return;

  // Strip "/uploads/" prefix and resolve to absolute path
  const relativePart = oldUrlPath.replace(/^\/uploads\//, '');
  const absolutePath = path.join(UPLOAD_BASE, relativePart);

  // Safety check: only delete files within the uploads directory
  const resolvedBase = path.resolve(UPLOAD_BASE);
  const resolvedTarget = path.resolve(absolutePath);
  if (!resolvedTarget.startsWith(resolvedBase)) return;

  fs.unlink(absolutePath, (err) => {
    if (err && err.code !== 'ENOENT') {
      console.error(`[fileHelper] Failed to delete ${absolutePath}:`, err.message);
    }
  });
}
