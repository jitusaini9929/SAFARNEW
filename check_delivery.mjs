import { MongoClient } from 'mongodb';

const uri = 'mongodb://user01:c1orp2bgIYpe8CspLXbx@82.29.165.45:5328/?authSource=admin';
const client = new MongoClient(uri);

async function main() {
  await client.connect();
  const db = client.db('safar');

  console.log('\n=== Recent Notification Delivery Logs ===');
  const collectionsList = await db.listCollections().toArray();
  const collectionNames = collectionsList.map(c => c.name);
  console.log('Available collections:', collectionNames);

  // We check if it is notification_delivery_log or logs
  const logCollectionName = collectionNames.find(name => name.includes('delivery')) || 'notification_delivery_logs';
  console.log(`Using collection: ${logCollectionName}`);

  const logs = await db.collection(logCollectionName)
    .find({})
    .sort({ created_at: -1 })
    .limit(10)
    .toArray();

  logs.forEach(log => {
    console.log(`[${log.created_at || log.timestamp}] User: ${log.user_id} | Token: ${log.token_preview} | Channel: ${log.channel} | MsgId: ${log.message_id || 'N/A'} | Error: ${log.error || 'None'}`);
  });

  await client.close();
}

main().catch(console.error);
