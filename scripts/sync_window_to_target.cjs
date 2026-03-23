const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { MongoClient, ObjectId } = require('mongodb');

dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(process.cwd(), '.env_open') });

const SOURCE_URI = process.env.MONGODB_URI;
const TARGET_URI = 'mongodb://root:PjI1CRdEQwZeBBk0WOKncU5rvVLQQEZ1WOQYu51G0PWDrKNgQs4NEs8HMuNPuKJQ@139.84.170.148:5432/?directConnection=true&authSource=admin';
const DB_NAME = process.env.MONGODB_DB_NAME || 'safar';

const WINDOW_START_IST = '2026-03-22 10:00:00 IST';
const WINDOW_END_IST = '2026-03-24 00:11:00 IST';
const WINDOW_START = new Date('2026-03-22T04:30:00.000Z');
const WINDOW_END = new Date('2026-03-23T18:41:00.000Z');
const WINDOW_START_ISO = WINDOW_START.toISOString();
const WINDOW_END_ISO = WINDOW_END.toISOString();

const BATCH_SIZE = 500;
const LOG_PREFIX = '[mongo-sync]';
const candidateFields = [
  'created_at',
  'updated_at',
  'timestamp',
  'started_at',
  'completed_at',
  'enrolled_at',
  'unlocked_at',
  'expires_at',
  'date',
];

const uniqueFilters = {
  users: ['id'],
  streaks: ['user_id'],
  password_reset_tokens: ['token_hash'],
  mood_snapshots: ['user_id', 'date_key'],
  focus_overlay_state: ['user_id'],
  focus_overlay_sessions: ['user_id', 'session_id'],
  user_perks: ['user_id', 'perk_id'],
  user_achievements: ['user_id', 'achievement_id'],
  mehfil_reactions: ['thought_id', 'user_id'],
  mehfil_saves: ['user_id', 'thought_id'],
  mehfil_friendships: ['user_id', 'friend_id'],
  orders: ['razorpay_order_id'],
  payments: ['razorpay_payment_id'],
  refunds: ['razorpay_refund_id'],
  course_enrollments: ['user_id', 'course_id'],
  sandesh_reactions: ['sandesh_id', 'user_id'],
  user_social_handles: ['user_id'],
};

function log(message) {
  const stamp = new Date().toISOString();
  console.log(`${LOG_PREFIX} ${stamp} ${message}`);
}

function makeWindowQuery() {
  const or = [];
  for (const field of candidateFields) {
    or.push({ [field]: { $gte: WINDOW_START, $lt: WINDOW_END } });
    or.push({ [field]: { $gte: WINDOW_START_ISO, $lt: WINDOW_END_ISO } });
  }

  or.push({
    _id: {
      $gte: ObjectId.createFromTime(Math.floor(WINDOW_START.getTime() / 1000)),
      $lt: ObjectId.createFromTime(Math.floor(WINDOW_END.getTime() / 1000)),
    },
  });

  return { $or: or };
}

function buildOperation(collectionName, doc) {
  const uniqueFields = uniqueFilters[collectionName];
  const filter = {};

  if (uniqueFields && uniqueFields.every((field) => doc[field] !== undefined)) {
    for (const field of uniqueFields) {
      filter[field] = doc[field];
    }
  } else {
    filter._id = doc._id;
  }

  const replacementFields = { ...doc };
  delete replacementFields._id;

  return {
    updateOne: {
      filter,
      update: {
        $set: replacementFields,
        $setOnInsert: { _id: doc._id },
      },
      upsert: true,
    },
  };
}

async function getCollections(db) {
  const collections = await db.listCollections().toArray();
  return collections.map((col) => col.name).sort();
}

async function syncCollection(sourceDb, targetDb, collectionName, query) {
  const sourceCollection = sourceDb.collection(collectionName);
  const targetCollection = targetDb.collection(collectionName);

  const total = await sourceCollection.countDocuments(query);
  if (total === 0) {
    log(`${collectionName}: no source documents in sync window`);
    return { collectionName, scanned: 0, upsertedBatches: 0 };
  }

  log(`${collectionName}: syncing ${total} source documents`);

  const cursor = sourceCollection.find(query, { noCursorTimeout: true });
  let scanned = 0;
  let batches = 0;
  let ops = [];

  for await (const doc of cursor) {
    ops.push(buildOperation(collectionName, doc));
    scanned += 1;

    if (ops.length >= BATCH_SIZE) {
      await targetCollection.bulkWrite(ops, { ordered: false });
      batches += 1;
      log(`${collectionName}: ${scanned}/${total} processed`);
      ops = [];
    }
  }

  if (ops.length > 0) {
    await targetCollection.bulkWrite(ops, { ordered: false });
    batches += 1;
    log(`${collectionName}: ${scanned}/${total} processed`);
  }

  log(`${collectionName}: complete`);
  return { collectionName, scanned, upsertedBatches: batches };
}

async function updateEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  const nextUri = 'mongodb://root:PjI1CRdEQwZeBBk0WOKncU5rvVLQQEZ1WOQYu51G0PWDrKNgQs4NEs8HMuNPuKJQ@139.84.170.148:5432/?directConnection=true';

  const current = fs.readFileSync(envPath, 'utf8');
  const updated = current.replace(/^MONGODB_URI=.*$/m, `MONGODB_URI=${nextUri}`);

  if (updated === current) {
    throw new Error('Failed to update .env: MONGODB_URI line not found');
  }

  fs.writeFileSync(envPath, updated, 'utf8');
  log(`.env updated to target MongoDB URI at ${nextUri}`);
}

async function main() {
  if (!SOURCE_URI) {
    throw new Error('MONGODB_URI is not set in .env');
  }

  log(`source=${SOURCE_URI}`);
  log(`target=${TARGET_URI}`);
  log(`window=${WINDOW_START_IST} -> ${WINDOW_END_IST}`);

  const sourceClient = new MongoClient(SOURCE_URI, {
    serverSelectionTimeoutMS: 20000,
    connectTimeoutMS: 20000,
  });
  const targetClient = new MongoClient(TARGET_URI, {
    serverSelectionTimeoutMS: 20000,
    connectTimeoutMS: 20000,
  });

  const query = makeWindowQuery();
  const summary = [];

  try {
    await sourceClient.connect();
    await targetClient.connect();

    const sourceDb = sourceClient.db(DB_NAME);
    const targetDb = targetClient.db(DB_NAME);
    const collections = await getCollections(sourceDb);

    log(`found ${collections.length} collections in source`);

    for (const collectionName of collections) {
      const result = await syncCollection(sourceDb, targetDb, collectionName, query);
      summary.push(result);
    }

    await updateEnvFile();

    log('SYNC COMPLETE');
    const syncedDocs = summary.reduce((acc, item) => acc + item.scanned, 0);
    log(`total documents processed: ${syncedDocs}`);
  } finally {
    await sourceClient.close().catch(() => {});
    await targetClient.close().catch(() => {});
  }
}

main().catch((error) => {
  console.error(`${LOG_PREFIX} ERROR ${error && error.stack ? error.stack : error}`);
  process.exit(1);
});
