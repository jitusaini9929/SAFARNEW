import { MongoClient } from 'mongodb';

const uri = 'mongodb://user01:c1orp2bgIYpe8CspLXbx@82.29.165.45:5328/?authSource=admin';
const client = new MongoClient(uri);

async function main() {
  await client.connect();
  const db = client.db('safar');

  console.log('\n=== All Device Tokens ===');
  const tokens = await db.collection('device_tokens')
    .find({})
    .sort({ updated_at: -1 })
    .toArray();

  tokens.forEach(t => {
    console.log(`Token: ${t.token ? t.token.slice(0, 8) + '...' + t.token.slice(-8) : 'N/A'}`);
    console.log(`  User ID: ${t.user_id}`);
    console.log(`  Platform: ${t.platform} | Flavor: ${t.flavor}`);
    console.log(`  App Version: ${t.app_version}`);
    console.log(`  Notifications Enabled: ${t.notifications_enabled}`);
    console.log(`  Last Seen At: ${t.last_seen_at}`);
    console.log(`  Updated At: ${t.updated_at}`);
    console.log(`  Revoked At: ${t.revoked_at}`);
    console.log('-----------------------------------');
  });

  await client.close();
}

main().catch(console.error);
