import { collections, connectMongo, getMongoClient } from "../server/db";

type Args = {
  dryRun: boolean;
};

function parseArgs(): Args {
  const args = new Set(process.argv.slice(2));
  return {
    dryRun: !args.has("--execute"),
  };
}

async function run() {
  const { dryRun } = parseArgs();
  console.log(`[mehfil-clear] starting${dryRun ? " (dry-run)" : ""}...`);

  await connectMongo();

  const usersCollection = collections.users();
  const reportsCollection = collections.mehfilReports();

  const affectedUsers = await usersCollection
    .find({
      $or: [
        { is_shadow_banned: true },
        { spam_strike_count: { $gt: 0 } },
        { mehfil_banned_forever: true },
        { mehfil_banned_until: { $ne: null } },
        { mehfil_ban_level: { $gt: 0 } },
        { mehfil_banned_reason: { $exists: true } },
        { mehfil_banned_at: { $exists: true } },
        { last_spam_strike_at: { $exists: true } },
      ],
    })
    .project({ id: 1, email: 1 })
    .toArray();

  const affectedUserIds = affectedUsers.map((user) => user.id).filter(Boolean);

  const relatedReportsCount = affectedUserIds.length
    ? await reportsCollection.countDocuments({
        $or: [
          { reported_user_id: { $in: affectedUserIds } },
          { reporter_id: { $in: affectedUserIds } },
        ],
      })
    : 0;

  console.log(`Affected users found: ${affectedUsers.length}`);
  console.log(`Related report records found: ${relatedReportsCount}`);

  if (affectedUsers.length > 0) {
    console.log("Sample affected users:");
    affectedUsers.slice(0, 10).forEach((user) => {
      console.log(`- ${user.email || "(no email)"} (${user.id})`);
    });
    if (affectedUsers.length > 10) {
      console.log(`- ...and ${affectedUsers.length - 10} more`);
    }
  }

  if (dryRun) {
    console.log("\n[mehfil-clear] dry-run complete. Re-run with --execute to apply changes.");
    await getMongoClient().close();
    return;
  }

  const userUpdateResult = affectedUserIds.length
    ? await usersCollection.updateMany(
        { id: { $in: affectedUserIds } },
        {
          $set: {
            is_shadow_banned: false,
            spam_strike_count: 0,
            mehfil_banned_forever: false,
            mehfil_banned_until: null,
            mehfil_ban_level: 0,
          },
          $unset: {
            mehfil_banned_reason: "",
            mehfil_banned_at: "",
            last_spam_strike_at: "",
          },
        },
      )
    : { matchedCount: 0, modifiedCount: 0 };

  const reportDeleteResult = affectedUserIds.length
    ? await reportsCollection.deleteMany({
        $or: [
          { reported_user_id: { $in: affectedUserIds } },
          { reporter_id: { $in: affectedUserIds } },
        ],
      })
    : { deletedCount: 0 };

  console.log("\nApplied changes");
  console.log(`- users matched: ${userUpdateResult.matchedCount}`);
  console.log(`- users updated: ${userUpdateResult.modifiedCount}`);
  console.log(`- reports deleted: ${reportDeleteResult.deletedCount || 0}`);

  await getMongoClient().close();
  console.log("\n[mehfil-clear] complete.");
}

run().catch(async (error) => {
  console.error("[mehfil-clear] failed:", error);
  try {
    await getMongoClient().close();
  } catch {
    // no-op
  }
  process.exit(1);
});
