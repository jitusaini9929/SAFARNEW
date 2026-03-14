/**
 * Migration Script: Clear base64 avatar data from MongoDB
 * 
 * Run ONCE after deploying the disk-based image storage changes.
 * This clears any base64 `data:image/...` strings from the `avatar` field
 * in the users collection, replacing them with null (default avatar will show).
 *
 * Usage:
 *   npx ts-node server/scripts/migrate-avatars.ts
 *   # or on VPS:
 *   node dist/server/scripts/migrate-avatars.js
 *
 * This is safe to run multiple times — it only affects documents where
 * the avatar starts with "data:" (base64 indicator).
 */

import { connectMongo, collections } from '../db';

async function migrate() {
  console.log('🔄 Connecting to MongoDB...');
  await connectMongo();

  console.log('🔍 Searching for users with base64 avatars...');

  // Count affected users
  const count = await collections.users().countDocuments({
    avatar: { $regex: /^data:/ },
  });

  if (count === 0) {
    console.log('✅ No base64 avatars found. Nothing to migrate.');
    process.exit(0);
  }

  console.log(`📊 Found ${count} users with base64 avatar data.`);

  // Nullify all base64 avatars — users will see the default avatar
  // They can re-upload via the new disk-based upload endpoint
  const result = await collections.users().updateMany(
    { avatar: { $regex: /^data:/ } },
    { $set: { avatar: null } }
  );

  console.log(`✅ Cleared base64 avatars from ${result.modifiedCount} users.`);
  console.log('   Users will see the default avatar until they re-upload.');

  // Also clean up the uploaded_images collection (optional — saves disk space)
  const imageCount = await collections.uploadedImages().countDocuments({});
  if (imageCount > 0) {
    console.log(`\n📊 Found ${imageCount} documents in uploaded_images collection.`);
    console.log('   These are legacy base64 uploads stored in MongoDB.');
    console.log('   To remove them (saves DB space), run:');
    console.log('     db.uploaded_images.drop()');
    console.log('   ⚠️  Only do this AFTER verifying no active references remain.');
  }

  process.exit(0);
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
