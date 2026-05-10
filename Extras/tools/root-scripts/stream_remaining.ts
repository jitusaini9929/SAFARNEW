import { MongoClient, ObjectId } from "mongodb";

const SOURCE = "mongodb://root:2azoqy8CFAjF16m3p4J5aKb5MlavOLuk83ArXLHGXBXv1aI8ddVEnYm0wO97rbMg@69.62.77.8:5433/?directConnection=true";
const DEST   = "mongodb://root:zv5lQ0TPZ660wATyw74sMyZRHptrssxM7RvtFxbjNrTZPSFxgS3XxsvjdzAEzBcf@139.84.170.148:5432/?directConnection=true";

const COLLECTIONS_TO_SYNC = [
  "focus_session_logs",
  "focus_sessions",
  "goal_activity_logs",
  "goals",
  "journal",
  "login_history",
  "mehfil_comments",
  "mehfil_reactions",
  "mehfil_reports",
  "mehfil_saves",
  "mehfil_shares",
  "mehfil_thoughts",
  "monthly_reports",
  "mood_snapshots",
  "moods",
  "sandesh_comments",
  "streaks",
  "study_plans",
  "user_achievements",
  "user_perks"
];

const BATCH_SIZE = 500;

async function syncCollection(srcCol: any, destCol: any, name: string) {
  console.log(`\n\n>>> Syncing collection: ${name}`);
  
  // Find last sync point
  const latestInDest = await destCol.find().sort({ _id: -1 }).limit(1).toArray();
  let lastId: ObjectId | null = latestInDest.length > 0 ? latestInDest[0]._id as ObjectId : null;
  console.log(`Resuming ${name} from _id: ${lastId ?? 'beginning'}`);

  let inserted = 0;
  let skipped  = 0;
  let totalBatches = 0;

  while (true) {
    const query = lastId ? { _id: { $gt: lastId } } : {};
    let batch: any[] = [];

    // Read batch from source
    for (let readRetry = 0; readRetry < 5; readRetry++) {
      try {
        batch = await srcCol.find(query).sort({ _id: 1 }).limit(BATCH_SIZE).toArray();
        break;
      } catch (err: any) {
        console.log(`\n[${name}] Read error (retry ${readRetry + 1}): ${err.message}`);
        await new Promise(r => setTimeout(r, 5000));
      }
    }

    if (batch.length === 0) {
      console.log(`\n[${name}] ✅ Done! Inserted: ${inserted}, Skipped: ${skipped}`);
      break;
    }

    // Write batch to dest
    let writeSuccess = false;
    for (let writeRetry = 0; writeRetry < 10; writeRetry++) {
      try {
        const result = await destCol.insertMany(batch, { ordered: false });
        inserted += result.insertedCount;
        writeSuccess = true;
        break;
      } catch (err: any) {
        if (err.code === 11000 || err.code === 11001) {
          const nInserted = err.result?.result?.nInserted ?? err.result?.nInserted ?? 0;
          skipped += batch.length - nInserted;
          inserted += nInserted;
          writeSuccess = true;
          break;
        }
        console.log(`\n[${name}] Write error (retry ${writeRetry + 1}): ${err.message.slice(0, 80)}`);
        await new Promise(r => setTimeout(r, 5000));
      }
    }

    if (!writeSuccess) {
      console.log(`\n[${name}] Max retries exceeded for this batch. Skipping...`);
    }

    lastId = batch[batch.length - 1]._id as ObjectId;
    totalBatches++;
    process.stdout.write(`\r[${name}] Inserted: ${inserted} | Skipped: ${skipped} | Batches: ${totalBatches}`);
  }
}

async function run() {
  const src  = new MongoClient(SOURCE, { serverSelectionTimeoutMS: 30000, socketTimeoutMS: 120000 });
  const dest = new MongoClient(DEST,   { serverSelectionTimeoutMS: 30000, socketTimeoutMS: 120000 });

  await src.connect();
  await dest.connect();
  console.log("Connected to both databases.");

  for (const name of COLLECTIONS_TO_SYNC) {
    const srcCol  = src.db('safar').collection(name);
    const destCol = dest.db('safar').collection(name);
    await syncCollection(srcCol, destCol, name);
  }

  await src.close();
  await dest.close();
  console.log("\n\n🎉 ALL SPECIFIED COLLECTIONS SYNCED!");
}

run().catch(console.error);
