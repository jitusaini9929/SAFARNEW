import { MongoClient } from 'mongodb';

const uri = 'mongodb://user01:c1orp2bgIYpe8CspLXbx@82.29.165.45:5328/?authSource=admin';
const client = new MongoClient(uri);

async function main() {
  await client.connect();
  const db = client.db('safar');

  // Get all active tokens
  const tokens = await db.collection('device_tokens').find({
    notifications_enabled: true,
    revoked_at: null,
    platform: 'android'
  }).toArray();

  // Get unique user IDs
  const userIds = [...new Set(tokens.map(t => t.user_id))];

  // Get user emails
  const users = await db.collection('users').find(
    { id: { $in: userIds } },
    { projection: { id: 1, email: 1, name: 1 } }
  ).toArray();

  const userMap = {};
  users.forEach(u => { userMap[u.id] = u; });

  console.log('\n=== Active FCM Tokens ===');
  tokens.forEach(t => {
    const user = userMap[t.user_id];
    const preview = t.token ? t.token.slice(0, 3) + '...' + t.token.slice(-3) : 'N/A';
    console.log(`Token: ${preview} | Flavor: ${t.flavor} | Name: ${user?.name} | Email: ${user?.email}`);
  });

  await client.close();
}

main().catch(console.error);
