import { MongoClient } from 'mongodb';

const uri = 'mongodb://user01:c1orp2bgIYpe8CspLXbx@82.29.165.45:5328/?authSource=admin';
const client = new MongoClient(uri);

async function main() {
  await client.connect();
  const db = client.db('safar');

  // Let's find users who have non-default avatar values
  const defaultUrl = 'https://www.gstatic.com/images/branding/product/1x/avatar_circle_blue_512dp.png';
  const customAvatars = await db.collection('users').find({
    avatar: { 
      $ne: null, 
      $exists: true,
      $nin: [defaultUrl, '']
    }
  }).limit(30).toArray();

  console.log(`=== Custom Avatars Found: ${customAvatars.length} ===`);
  customAvatars.forEach(u => {
    console.log(`ID: ${u.id} | Name: ${u.name} | Avatar: ${u.avatar}`);
  });

  await client.close();
}

main().catch(console.error);
