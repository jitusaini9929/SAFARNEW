import { collections, connectMongo } from '../db';

const TARGET_EMAIL = process.argv[2]?.trim().toLowerCase();

if (!TARGET_EMAIL) {
  console.error('Usage: npx tsx server/scripts/delete-user-by-email.ts <email>');
  process.exit(1);
}

const USER_ID_COLLECTIONS = [
  'streaks',
  'goals',
  'goalActivityLogs',
  'moods',
  'moodSnapshots',
  'journal',
  'loginHistory',
  'focusSessions',
  'focusSessionLogs',
  'ekagraModeSessions',
  'focusOverlayState',
  'focusOverlaySessions',
  'sectionActivity',
  'dailyAggregates',
  'monthlyReports',
  'userPerks',
  'userAchievements',
  'mehfilThoughts',
  'mehfilReactions',
  'mehfilComments',
  'mehfilSaves',
  'mehfilReports',
  'mehfilShares',
  'orders',
  'payments',
  'refunds',
  'courseEnrollments',
  'uploadedImages',
  'deviceTokens',
  'notificationPreferences',
  'notificationDeliveryLog',
  'feedbackEntries',
  'missionProfiles',
  'missionPlans',
  'missionTasks',
  'revisionItems',
  'mockResults',
  'readinessSnapshots',
  'backlogEvents',
  'passwordResetTokens',
  'sessions',
  'userSocialHandles',
] as const;

async function main() {
  await connectMongo();

  const user = await collections.users().findOne(
    { email: TARGET_EMAIL },
    { projection: { id: 1, email: 1, name: 1 } },
  );

  if (!user?.id) {
    console.log(`[delete-user-by-email] No user found for email: ${TARGET_EMAIL}`);
    process.exit(0);
  }

  const userId = user.id;
  console.log(`[delete-user-by-email] Deleting user "${user.name ?? 'unknown'}" (${user.email}) with id ${userId}`);

  let totalDeleted = 0;

  for (const key of USER_ID_COLLECTIONS) {
    const res = await (collections as any)[key]().deleteMany({ user_id: userId });
    totalDeleted += res.deletedCount ?? 0;
    if ((res.deletedCount ?? 0) > 0) {
      console.log(`  - ${key}: deleted ${res.deletedCount} by user_id`);
    }
  }

  // Collections/fields that do not use user_id.
  const friendshipRes = await collections.mehfilFriendships().deleteMany({
    $or: [{ user_id: userId }, { friend_id: userId }],
  });
  totalDeleted += friendshipRes.deletedCount ?? 0;
  if ((friendshipRes.deletedCount ?? 0) > 0) {
    console.log(`  - mehfilFriendships: deleted ${friendshipRes.deletedCount}`);
  }

  const mockRecoveryRes = await collections.mockRecoveryPlans().deleteMany({
    $or: [{ user_id: userId }, { userId: userId }],
  });
  totalDeleted += mockRecoveryRes.deletedCount ?? 0;
  if ((mockRecoveryRes.deletedCount ?? 0) > 0) {
    console.log(`  - mockRecoveryPlans: deleted ${mockRecoveryRes.deletedCount}`);
  }

  const birthdayRes = await collections.birthdayWishes().deleteMany({
    $or: [{ user_id: userId }, { userId: userId }],
  });
  totalDeleted += birthdayRes.deletedCount ?? 0;
  if ((birthdayRes.deletedCount ?? 0) > 0) {
    console.log(`  - birthdayWishes: deleted ${birthdayRes.deletedCount}`);
  }

  const userDeleteRes = await collections.users().deleteOne({ id: userId });
  totalDeleted += userDeleteRes.deletedCount ?? 0;
  console.log(`  - users: deleted ${userDeleteRes.deletedCount ?? 0}`);

  const verifyByEmail = await collections.users().findOne({ email: TARGET_EMAIL }, { projection: { id: 1 } });
  const verifyById = await collections.users().findOne({ id: userId }, { projection: { id: 1 } });

  if (verifyByEmail || verifyById) {
    console.error('[delete-user-by-email] Verification failed: user record still exists.');
    process.exit(1);
  }

  console.log(`[delete-user-by-email] Done. Total deleted documents: ${totalDeleted}`);
}

main().catch((err) => {
  console.error('[delete-user-by-email] Error:', err);
  process.exit(1);
});
