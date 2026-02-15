import { collections, connectMongo, getMongoClient } from "../server/db";

type BackfillSummary = {
  thoughtsMissingCategory: number;
  thoughtsMissingStatus: number;
  thoughtsMissingTags: number;
  thoughtsMissingScore: number;
  thoughtsMissingToxicFlag: number;
  thoughtsMissingExpiry: number;
  usersMissingStrikeCount: number;
  usersMissingShadowBan: number;
};

function parseArgs() {
  const args = new Set(process.argv.slice(2));
  return {
    dryRun: args.has("--dry-run"),
  };
}

async function getSummary(): Promise<BackfillSummary> {
  const thoughtCollection = collections.mehfilThoughts();
  const usersCollection = collections.users();

  const [
    thoughtsMissingCategory,
    thoughtsMissingStatus,
    thoughtsMissingTags,
    thoughtsMissingScore,
    thoughtsMissingToxicFlag,
    thoughtsMissingExpiry,
    usersMissingStrikeCount,
    usersMissingShadowBan,
  ] = await Promise.all([
    thoughtCollection.countDocuments({ category: { $exists: false } }),
    thoughtCollection.countDocuments({ status: { $exists: false } }),
    thoughtCollection.countDocuments({ ai_tags: { $exists: false } }),
    thoughtCollection.countDocuments({ ai_score: { $exists: false } }),
    thoughtCollection.countDocuments({ is_toxic: { $exists: false } }),
    thoughtCollection.countDocuments({ expires_at: { $exists: false } }),
    usersCollection.countDocuments({ spam_strike_count: { $exists: false } }),
    usersCollection.countDocuments({ is_shadow_banned: { $exists: false } }),
  ]);

  return {
    thoughtsMissingCategory,
    thoughtsMissingStatus,
    thoughtsMissingTags,
    thoughtsMissingScore,
    thoughtsMissingToxicFlag,
    thoughtsMissingExpiry,
    usersMissingStrikeCount,
    usersMissingShadowBan,
  };
}

function printSummary(label: string, summary: BackfillSummary) {
  console.log(`\n${label}`);
  console.log(`- thoughts missing category: ${summary.thoughtsMissingCategory}`);
  console.log(`- thoughts missing status: ${summary.thoughtsMissingStatus}`);
  console.log(`- thoughts missing ai_tags: ${summary.thoughtsMissingTags}`);
  console.log(`- thoughts missing ai_score: ${summary.thoughtsMissingScore}`);
  console.log(`- thoughts missing is_toxic: ${summary.thoughtsMissingToxicFlag}`);
  console.log(`- thoughts missing expires_at: ${summary.thoughtsMissingExpiry}`);
  console.log(`- users missing spam_strike_count: ${summary.usersMissingStrikeCount}`);
  console.log(`- users missing is_shadow_banned: ${summary.usersMissingShadowBan}`);
}

async function run() {
  const { dryRun } = parseArgs();
  console.log(`[mehfil-backfill] starting${dryRun ? " (dry-run)" : ""}...`);

  await connectMongo();

  const before = await getSummary();
  printSummary("Before backfill", before);

  if (dryRun) {
    console.log("\n[mehfil-backfill] dry-run complete. No changes were written.");
    await getMongoClient().close();
    return;
  }

  const thoughtCollection = collections.mehfilThoughts();
  const usersCollection = collections.users();

  const [
    categoryUpdate,
    statusUpdate,
    tagsUpdate,
    scoreUpdate,
    toxicUpdate,
    expiryUpdate,
    reasonUpdate,
    strikeUpdate,
    shadowBanUpdate,
  ] = await Promise.all([
    thoughtCollection.updateMany(
      { category: { $exists: false } },
      { $set: { category: "ACADEMIC" } },
    ),
    thoughtCollection.updateMany(
      { status: { $exists: false } },
      { $set: { status: "approved" } },
    ),
    thoughtCollection.updateMany(
      { ai_tags: { $exists: false } },
      { $set: { ai_tags: [] } },
    ),
    thoughtCollection.updateMany(
      { ai_score: { $exists: false } },
      { $set: { ai_score: null } },
    ),
    thoughtCollection.updateMany(
      { is_toxic: { $exists: false } },
      { $set: { is_toxic: false } },
    ),
    thoughtCollection.updateMany(
      { expires_at: { $exists: false } },
      { $set: { expires_at: null } },
    ),
    thoughtCollection.updateMany(
      { moderation_reason: { $exists: false } },
      { $set: { moderation_reason: "Backfilled legacy Mehfil record." } },
    ),
    usersCollection.updateMany(
      { spam_strike_count: { $exists: false } },
      { $set: { spam_strike_count: 0 } },
    ),
    usersCollection.updateMany(
      { is_shadow_banned: { $exists: false } },
      { $set: { is_shadow_banned: false } },
    ),
  ]);

  console.log("\nUpdated records");
  console.log(`- thoughts category set: ${categoryUpdate.modifiedCount}`);
  console.log(`- thoughts status set: ${statusUpdate.modifiedCount}`);
  console.log(`- thoughts ai_tags set: ${tagsUpdate.modifiedCount}`);
  console.log(`- thoughts ai_score set: ${scoreUpdate.modifiedCount}`);
  console.log(`- thoughts is_toxic set: ${toxicUpdate.modifiedCount}`);
  console.log(`- thoughts expires_at set: ${expiryUpdate.modifiedCount}`);
  console.log(`- thoughts moderation_reason set: ${reasonUpdate.modifiedCount}`);
  console.log(`- users spam_strike_count set: ${strikeUpdate.modifiedCount}`);
  console.log(`- users is_shadow_banned set: ${shadowBanUpdate.modifiedCount}`);

  const after = await getSummary();
  printSummary("After backfill", after);

  await getMongoClient().close();
  console.log("\n[mehfil-backfill] complete.");
}

run().catch(async (error) => {
  console.error("[mehfil-backfill] failed:", error);
  try {
    await getMongoClient().close();
  } catch {
    // no-op
  }
  process.exit(1);
});
