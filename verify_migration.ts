import { MongoClient } from "mongodb";
import { writeFileSync } from "fs";

const SOURCE = "mongodb://root:2azoqy8CFAjF16m3p4J5aKb5MlavOLuk83ArXLHGXBXv1aI8ddVEnYm0wO97rbMg@69.62.77.8:5433/?directConnection=true";
const DEST   = "mongodb://root:zv5lQ0TPZ660wATyw74sMyZRHptrssxM7RvtFxbjNrTZPSFxgS3XxsvjdzAEzBcf@139.84.170.148:5432/?directConnection=true";

async function run() {
  const src  = new MongoClient(SOURCE);
  const dest = new MongoClient(DEST);
  await src.connect();
  await dest.connect();

  const srcCollections = await src.db('safar').listCollections().toArray();
  const names = srcCollections.map(c => c.name).sort();

  const results: { name: string; src: number; dest: number; missing: number }[] = [];

  for (const name of names) {
    const srcCount  = await src.db('safar').collection(name).countDocuments();
    const destCount = await dest.db('safar').collection(name).countDocuments();
    results.push({ name, src: srcCount, dest: destCount, missing: srcCount - destCount });
  }

  const missing = results.filter(r => r.missing !== 0);
  const synced  = results.filter(r => r.missing === 0);

  let report = `MIGRATION STATUS REPORT\n`;
  report += `=======================\n\n`;
  report += `SYNCED COLLECTIONS: ${synced.length}\n`;
  report += `MISSING COLLECTIONS: ${missing.length}\n`;
  report += `TOTAL COLLECTIONS: ${results.length}\n\n`;

  if (missing.length > 0) {
    report += `COLLECTIONS WITH MISSING DOCUMENTS:\n`;
    report += `----------------------------------\n`;
    for (const r of missing) {
      report += `${r.name.padEnd(30)} | Source: ${r.src.toString().padStart(10)} | Dest: ${r.dest.toString().padStart(10)} | Missing: ${r.missing.toString().padStart(10)}\n`;
    }
  } else {
    report += `All collections are perfectly synced! ✅\n`;
  }

  console.log(report);
  writeFileSync("d:/SAFAR/full_migration_report.txt", report);

  await src.close();
  await dest.close();
}
run().catch(console.error);
