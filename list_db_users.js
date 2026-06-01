const { MongoClient } = require('mongodb');

const uri = 'mongodb://user01:c1orp2bgIYpe8CspLXbx@82.29.165.45:5328/?authSource=admin';
const client = new MongoClient(uri);

async function main() {
  await client.connect();
  const db = client.db('safar');

  const users = await db.collection('users').find({}).toArray();
  console.log('=== Users ===');
  users.forEach(u => {
    console.log(`ID: ${u.id} | Name: ${u.name} | Email: ${u.email} | isAdmin: ${u.isAdmin}`);
  });

  const tokens = await db.collection('device_tokens').find({}).toArray();
  console.log('\n=== Device Tokens ===');
  tokens.forEach(t => {
    console.log(`Token: ${t.token?.slice(0, 10)}... | UserID: ${t.user_id} | Enabled: ${t.notifications_enabled} | Flavor: ${t.flavor}`);
  });

  await client.close();
}

main().catch(console.error);
