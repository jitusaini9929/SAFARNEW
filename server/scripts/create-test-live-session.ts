import { collections, connectMongo } from '../db';
import { v4 as uuidv4 } from 'uuid';

async function main() {
  await connectMongo();

  // Find the first user in the DB
  const user = await collections.users().findOne({});
  if (!user) {
    console.error('❌ No users found in database! Please register or log in first.');
    process.exit(1);
  }

  console.log(`👤 Found user: ${user.name} (${user.email || 'no-email'}) - ID: ${user.id}`);

  // Ensure they are an admin so they can manage sessions
  if (!user.isAdmin) {
    await collections.users().updateOne({ id: user.id }, { $set: { isAdmin: true } });
    console.log(`🔑 Granted admin rights (isAdmin: true) to user ${user.name} for testing.`);
  }

  // Create a scheduled session
  const courseId = 'test-course-id';
  const sessionId = uuidv4();
  const scheduledStart = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

  const doc = {
    id: sessionId,
    title: 'Test Live Stream Session',
    description: 'This is a test session to verify YouTube Live integration.',
    course_id: courseId,
    teacher_id: user.id,
    scheduled_start_at: scheduledStart,
    scheduled_end_at: new Date(scheduledStart.getTime() + 60 * 60 * 1000), // 1 hour duration
    status: 'scheduled',
    youtube_video_id: null,
    youtube_watch_url: null,
    youtube_embed_url: null,
    thumbnail_url: null,
    is_chat_enabled: true,
    is_recording_available: false,
    recording_video_id: null,
    resources: [],
    created_by: user.id,
    created_at: new Date(),
    updated_at: new Date(),
    is_deleted: false,
  };

  // Remove any existing test sessions for clean state
  await collections.liveSessions().deleteMany({ course_id: courseId });

  // Insert the new session
  await collections.liveSessions().insertOne(doc);

  console.log(`✅ Created scheduled live session:`);
  console.log(`   Session ID: ${sessionId}`);
  console.log(`   Course ID:  ${courseId}`);
  console.log(`   Title:      ${doc.title}`);
  console.log(`\n👉 Open the UI at: http://localhost:8080/live-sessions`);
  console.log(`   Make sure you are logged in as this user!`);

  process.exit(0);
}

main().catch(e => {
  console.error('❌ Error:', e);
  process.exit(1);
});
