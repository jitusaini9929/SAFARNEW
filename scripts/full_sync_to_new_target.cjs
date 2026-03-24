const { MongoClient } = require('mongodb');

const SOURCE_URI = 'mongodb://root:2azoqy8CFAjF16m3p4J5aKb5MlavOLuk83ArXLHGXBXv1aI8ddVEnYm0wO97rbMg@69.62.77.8:5433/?directConnection=true';
const TARGET_URI = 'mongodb://root:PjI1CRdEQwZeBBk0WOKncU5rvVLQQEZ1WOQYu51G0PWDrKNgQs4NEs8HMuNPuKJQ@139.84.170.148:6397/?directConnection=true';
const DB_NAME = 'safar';
const BATCH_SIZE = 500;
const LOG_PREFIX = '[full-mongo-sync]';

const uniqueFilters = {
  users: ['id'],
  moods: ['id'],
  mood_snapshots: ['user_id', 'date_key'],
  goals: ['id'],
  goal_activity_logs: ['id'],
  journal: ['id'],
  streaks: ['user_id'],
  sessions: ['sid'],
  password_reset_tokens: ['token_hash'],
  login_history: ['id'],
  focus_sessions: ['id'],
  focus_session_logs: ['id'],
  focus_overlay_state: ['user_id'],
  focus_overlay_sessions: ['user_id', 'session_id'],
  section_activity: ['chunk_key'],
  daily_aggregates: ['user_id', 'date'],
  monthly_reports: ['user_id', 'month'],
  perk_definitions: ['id'],
  user_perks: ['user_id', 'perk_id'],
  achievement_definitions: ['id'],
  user_achievements: ['user_id', 'achievement_id'],
  mehfil_thoughts: ['id'],
  mehfil_reactions: ['thought_id', 'user_id'],
  mehfil_comments: ['id'],
  mehfil_saves: ['user_id', 'thought_id'],
  mehfil_reports: ['id'],
  mehfil_shares: ['id'],
  mehfil_friendships: ['user_id', 'friend_id'],
  orders: ['razorpay_order_id'],
  payments: ['razorpay_payment_id'],
  refunds: ['razorpay_refund_id'],
  course_enrollments: ['user_id', 'course_id'],
  transaction_logs: ['id'],
  uploaded_images: ['id'],
  app_settings: ['key'],
  sandesh_messages: ['id'],
  sandesh_reactions: ['sandesh_id', 'user_id'],
  sandesh_comments: ['id'],
  user_social_handles: ['user_id'],
  study_plans: ['id'],
};

function log(message) {
  console.log(`${LOG_PREFIX} ${new Date().toISOString()} ${message}`);
}

function buildFilter(collectionName, doc) {
  const explicit = uniqueFilters[collectionName];
  if (explicit && explicit.every((field) => doc[field] !== undefined && doc[field] !== null)) {
    const filter = {};
    for (const field of explicit) {
      filter[field] = doc[field];
    }
    return filter;
  }

  if (doc.id !== undefined && doc.id !== null) {
    return { id: doc.id };
  }

  return { _id: doc._id };
}

function opSignature(filter) {
  return JSON.stringify(filter, Object.keys(filter).sort());
}

async function flushBatch(targetCollection, collectionName, docs) {
  if (docs.length === 0) return;

  const deduped = new Map();
  for (const doc of docs) {
    const filter = buildFilter(collectionName, doc);
    deduped.set(opSignature(filter), { filter, doc });
  }

  const ops = [];
  for (const { filter, doc } of deduped.values()) {
    const replacement = { ...doc };
    delete replacement._id;

    ops.push({
      updateOne: {
        filter,
        update: {
          $set: replacement,
          $setOnInsert: { _id: doc._id },
        },
        upsert: true,
      },
    });
  }

  await targetCollection.bulkWrite(ops, { ordered: false });
}

async function syncCollection(sourceDb, targetDb, collectionName) {
  const sourceCollection = sourceDb.collection(collectionName);
  const targetCollection = targetDb.collection(collectionName);
  const total = await sourceCollection.countDocuments({});

  if (total === 0) {
    log(`${collectionName}: empty, skipped`);
    return;
  }

  log(`${collectionName}: syncing ${total} documents`);

  const cursor = sourceCollection.find({}, { noCursorTimeout: true }).sort({ _id: 1 }).batchSize(BATCH_SIZE);
  let batch = [];
  let processed = 0;

  for await (const doc of cursor) {
    batch.push(doc);

    if (batch.length >= BATCH_SIZE) {
      await flushBatch(targetCollection, collectionName, batch);
      processed += batch.length;
      log(`${collectionName}: ${processed}/${total} processed`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await flushBatch(targetCollection, collectionName, batch);
    processed += batch.length;
    log(`${collectionName}: ${processed}/${total} processed`);
  }

  log(`${collectionName}: complete`);
}

async function main() {
  const sourceClient = new MongoClient(SOURCE_URI, {
    connectTimeoutMS: 20000,
    serverSelectionTimeoutMS: 20000,
  });
  const targetClient = new MongoClient(TARGET_URI, {
    connectTimeoutMS: 20000,
    serverSelectionTimeoutMS: 20000,
  });

  await sourceClient.connect();
  await targetClient.connect();

  const sourceDb = sourceClient.db(DB_NAME);
  const targetDb = targetClient.db(DB_NAME);
  const collections = (await sourceDb.listCollections({}, { nameOnly: true }).toArray())
    .map((col) => col.name)
    .sort();

  log(`source=${SOURCE_URI}`);
  log(`target=${TARGET_URI}`);
  log(`db=${DB_NAME}`);
  log(`collections=${collections.length}`);

  try {
    for (const collectionName of collections) {
      await syncCollection(sourceDb, targetDb, collectionName);
    }

    log('FULL SYNC COMPLETE');
  } finally {
    await sourceClient.close().catch(() => {});
    await targetClient.close().catch(() => {});
  }
}

main().catch((error) => {
  console.error(`${LOG_PREFIX} ERROR ${error && error.stack ? error.stack : error}`);
  process.exit(1);
});
