import { collections, connectMongo } from '../db';
async function main() {
  await connectMongo();
  const users = await collections.users().find(
    { $or: [{ name: 't' }, { username: 't' }, { display_name: 't' }] },
    { projection: { id: 1, name: 1, username: 1, display_name: 1, email: 1 } }
  ).toArray();
  console.log('Found users:', JSON.stringify(users, null, 2));

  // Also check thoughts with author_name 't'
  const thoughts = await collections.mehfilThoughts().find(
    { author_name: 't' },
    { projection: { id: 1, user_id: 1, author_name: 1, content: 1 } }
  ).limit(10).toArray();
  console.log('Thoughts by "t":', JSON.stringify(thoughts, null, 2));

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
