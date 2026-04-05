import { v4 as uuidv4 } from 'uuid';
import { collections, connectMongo, getMongoClient } from '../db';

const IST_TIMEZONE = 'Asia/Kolkata';
const DAY_MS = 24 * 60 * 60 * 1000;
const istFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: IST_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const getISTDateKey = (date: Date) => istFormatter.format(date);
const shiftISTDateKey = (dateKey: string, days: number) => {
  const baseUTC = new Date(`${dateKey}T00:00:00.000Z`);
  const shifted = new Date(baseUTC.getTime() + days * DAY_MS);
  return getISTDateKey(shifted);
};

const isDryRun = process.argv.includes('--dry-run');
const limitArgIndex = process.argv.findIndex((arg) => arg === '--limit');
const limit = limitArgIndex !== -1 ? Number(process.argv[limitArgIndex + 1]) : null;

type LoginHistoryRow = { timestamp?: Date | string | null };

function normalizeTimestamp(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(String(value));
  if (!Number.isFinite(parsed.getTime())) return null;
  return parsed;
}

function computeLoginStreak(rows: LoginHistoryRow[]) {
  const daySet = new Set<string>();
  let latestKey: string | null = null;
  let latestTimestamp: Date | null = null;

  for (const row of rows) {
    const ts = normalizeTimestamp(row.timestamp);
    if (!ts) continue;
    const key = getISTDateKey(ts);
    daySet.add(key);
    if (!latestKey || key > latestKey) {
      latestKey = key;
      latestTimestamp = ts;
    }
  }

  if (!latestKey || !latestTimestamp) {
    return { streak: 0, latestTimestamp: null };
  }

  let streak = 0;
  let cursorKey = latestKey;
  while (daySet.has(cursorKey)) {
    streak += 1;
    cursorKey = shiftISTDateKey(cursorKey, -1);
  }

  return { streak, latestTimestamp };
}

async function main() {
  await connectMongo();
  const loginHistory = collections.loginHistory();
  const streaks = collections.streaks();

  const userIds = await loginHistory.distinct('user_id');
  const targetIds = limit ? userIds.slice(0, limit) : userIds;

  let processed = 0;
  let updated = 0;
  const bulkOps = [];

  for (const userId of targetIds) {
    const rows = await loginHistory
      .find({ user_id: userId }, { projection: { timestamp: 1 } })
      .sort({ timestamp: -1 })
      .limit(4000)
      .toArray();

    const { streak, latestTimestamp } = computeLoginStreak(rows);
    processed += 1;

    if (!latestTimestamp) {
      continue;
    }

    updated += 1;
    bulkOps.push({
      updateOne: {
        filter: { user_id: userId },
        update: {
          $set: {
            login_streak: streak,
            last_login_date: latestTimestamp,
          },
          $setOnInsert: {
            id: uuidv4(),
            user_id: userId,
          },
        },
        upsert: true,
      },
    });

    if (bulkOps.length >= 200) {
      if (!isDryRun) {
        await streaks.bulkWrite(bulkOps, { ordered: false });
      }
      bulkOps.length = 0;
    }

    if ((processed % 200) === 0) {
      console.log(`[BACKFILL] Processed ${processed}/${targetIds.length} users...`);
    }
  }

  if (bulkOps.length > 0) {
    if (!isDryRun) {
      await streaks.bulkWrite(bulkOps, { ordered: false });
    }
  }

  console.log(`[BACKFILL] Done. Processed=${processed} Updated=${updated} DryRun=${isDryRun}`);
  await getMongoClient()?.close?.();
}

main().catch((err) => {
  console.error('[BACKFILL] Failed:', err);
  process.exit(1);
});
