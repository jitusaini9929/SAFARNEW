import { MongoClient } from "mongodb";

const SOURCE = "mongodb://root:2azoqy8CFAjF16m3p4J5aKb5MlavOLuk83ArXLHGXBXv1aI8ddVEnYm0wO97rbMg@69.62.77.8:5433/?directConnection=true";
const DEST   = "mongodb://root:zv5lQ0TPZ660wATyw74sMyZRHptrssxM7RvtFxbjNrTZPSFxgS3XxsvjdzAEzBcf@139.84.170.148:5432/?directConnection=true";

async function run() {
  const src  = new MongoClient(SOURCE);
  const dest = new MongoClient(DEST);
  try {
    await src.connect();
    await dest.connect();
    const srcCount  = await src.db('safar').collection('users').countDocuments();
    const destCount = await dest.db('safar').collection('users').countDocuments();
    console.log(`Source users  : ${srcCount.toLocaleString()}`);
    console.log(`Dest users    : ${destCount.toLocaleString()}`);
    console.log(`Missing       : ${(srcCount - destCount).toLocaleString()}`);
    console.log(`Progress      : ${((destCount / srcCount) * 100).toFixed(1)}%`);
  } finally {
    await src.close();
    await dest.close();
  }
}
run().catch(console.error);
