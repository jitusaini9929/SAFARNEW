import { MongoClient } from 'mongodb';
import bcrypt from 'bcrypt';

const uri = 'mongodb://user01:c1orp2bgIYpe8CspLXbx@82.29.165.45:5328/?authSource=admin';
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });

async function main() {
  console.log('Connecting...');
  await client.connect();
  console.log('Connected!');
  const db = client.db('safar');
  const user = await db.collection('users').findOne({ email: 'steve123@example.com' });
  if (user) {
    console.log('User email:', user.email);
    console.log('Has password_hash:', !!user.password_hash);
    if (user.password_hash) {
      const match = await bcrypt.compare('password123', user.password_hash);
      console.log('Bcrypt comparison with password123:', match);
    }
  } else {
    console.log('User not found!');
  }
  await client.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
