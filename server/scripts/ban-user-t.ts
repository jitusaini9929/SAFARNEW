/**
 * Admin script: permanently ban user with id "5a6a05a8-911f-4ff8-9d43-ec2bd2a3ac1b" (displays as "t")
 * and delete all their Mehfil posts.
 * Run: npx tsx server/scripts/ban-user-t.ts
 */
import { collections, connectMongo } from '../db';

const TARGET_USER_ID = '5a6a05a8-911f-4ff8-9d43-ec2bd2a3ac1b';

async function main() {
  await connectMongo();

  // Fetch user info first
  const user = await collections.users().findOne(
    { id: TARGET_USER_ID },
    { projection: { id: 1, name: 1, email: 1 } }
  );

  if (!user) {
    console.log(`[ban-user-t] User with id "${TARGET_USER_ID}" not found in users collection.`);
    console.log('[ban-user-t] Proceeding to delete their thoughts from mehfil_thoughts anyway...');
  } else {
    console.log(`[ban-user-t] Targeting user: ${JSON.stringify({ id: user.id, name: user.name, email: user.email })}`);

    // Apply full ban
    const result = await collections.users().updateOne(
      { id: TARGET_USER_ID },
      {
        $set: {
          // Mehfil posting ban (permanent)
          mehfil_banned_forever: true,
          mehfil_ban_level: 3,
          mehfil_banned_until: null,
          mehfil_banned_reason: 'abusive_content_hindi_bypass',
          mehfil_banned_at: new Date(),
          // Shadow ban (prevents feed from showing their content)
          is_shadow_banned: true,
          // Full site ban
          is_banned: true,
          banned_reason: 'Posting sexual/abusive content in Hindi to bypass the content filter in Mehfil.',
          banned_at: new Date(),
        },
      }
    );

    console.log(`[ban-user-t] User ban applied. Modified: ${result.modifiedCount}`);
  }

  // Delete ALL their Mehfil thoughts
  const deletedThoughts = await collections.mehfilThoughts().deleteMany({ user_id: TARGET_USER_ID });
  console.log(`[ban-user-t] Deleted ${deletedThoughts.deletedCount} thought(s) from this user.`);

  // Delete their comments too
  const deletedComments = await collections.mehfilComments().deleteMany({ user_id: TARGET_USER_ID });
  console.log(`[ban-user-t] Deleted ${deletedComments.deletedCount} comment(s) from this user.`);

  console.log('[ban-user-t] Done. Server restart NOT required — ban takes effect on next post attempt.');
  process.exit(0);
}

main().catch(err => {
  console.error('[ban-user-t] Error:', err);
  process.exit(1);
});
