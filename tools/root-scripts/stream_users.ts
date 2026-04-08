import { MongoClient, ObjectId } from "mongodb";

const SOURCE = "mongodb://root:2azoqy8CFAjF16m3p4J5aKb5MlavOLuk83ArXLHGXBXv1aI8ddVEnYm0wO97rbMg@69.62.77.8:5433/?directConnection=true";
const DEST   = "mongodb://root:zv5lQ0TPZ660wATyw74sMyZRHptrssxM7RvtFxbjNrTZPSFxgS3XxsvjdzAEzBcf@139.84.170.148:5432/?directConnection=true";

const BATCH_SIZE = 200;

async function run() {
  const src  = new MongoClient(SOURCE, { serverSelectionTimeoutMS: 30000, socketTimeoutMS: 120000 });
  const dest = new MongoClient(DEST,   { serverSelectionTimeoutMS: 30000, socketTimeoutMS: 120000 });

  await src.connect();
  await dest.connect();
  console.log("Connected to both databases.");

  const srcCol  = src.db('safar').collection('users');
  const destCol = dest.db('safar').collection('users');

  // Always resume from the highest _id currently in dest
  const latestInDest = await destCol.find().sort({ _id: -1 }).limit(1).toArray();
  let lastId: ObjectId | null = latestInDest.length > 0 ? latestInDest[0]._id as ObjectId : null;
  console.log(`Resuming from _id: ${lastId ?? 'beginning'}`);

  let inserted = 0;
  let skipped  = 0;
  let totalBatches = 0;

  while (true) {
    const query = lastId ? { _id: { $gt: lastId } } : {};
    let batch: any[] = [];

    // Read batch from source (retry on network error)
    for (let readRetry = 0; readRetry < 5; readRetry++) {
      try {
        batch = await srcCol.find(query).sort({ _id: 1 }).limit(BATCH_SIZE).toArray();
        break;
      } catch (err: any) {
        console.log(`\nRead error (retry ${readRetry + 1}): ${err.message}`);
        await new Promise(r => setTimeout(r, 5000));
      }
    }

    if (batch.length === 0) {
      console.log(`\n✅ All done! Inserted: ${inserted}, Skipped (duplicates): ${skipped}`);
      break;
    }

    // Write batch to dest (retry on network error, keeping the same batch)
    let writeSuccess = false;
    for (let writeRetry = 0; writeRetry < 10; writeRetry++) {
      try {
        const result = await destCol.insertMany(batch, { ordered: false });
        inserted += result.insertedCount;
        writeSuccess = true;
        break;
      } catch (err: any) {
        if (err.code === 11000 || err.code === 11001) {
          // Duplicate key — some inserted, some skipped
          const nInserted = err.result?.result?.nInserted ?? err.result?.nInserted ?? 0;
          skipped += batch.length - nInserted;
          inserted += nInserted;
          writeSuccess = true;
          break;
        }
        console.log(`\nWrite error (retry ${writeRetry + 1}): ${err.message.slice(0, 80)}`);
        await new Promise(r => setTimeout(r, 5000));
      }
    }

    if (!writeSuccess) {
      console.log("\nMax retries exceeded for this batch. Skipping...");
    }

    lastId = batch[batch.length - 1]._id as ObjectId;
    totalBatches++;
    process.stdout.write(`\rInserted: ${inserted} | Skipped: ${skipped} | Batches: ${totalBatches} | Last ID: ${lastId}`);
  }

  await src.close();
  await dest.close();
}

run().catch(console.error);
