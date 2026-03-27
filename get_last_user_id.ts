import { MongoClient } from "mongodb";

const uri = "mongodb://root:zv5lQ0TPZ660wATyw74sMyZRHptrssxM7RvtFxbjNrTZPSFxgS3XxsvjdzAEzBcf@139.84.170.148:5432/?directConnection=true";

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const database = client.db('safar');
    const users = database.collection('users');
    
    // Find the document with the highest _id (most recently created)
    const latestUser = await users.find().sort({ _id: -1 }).limit(1).toArray();
    
    if (latestUser.length > 0) {
      console.log(latestUser[0]._id.toString());
    } else {
      console.log("No users found");
    }
  } catch (error) {
    console.error(error);
  } finally {
    await client.close();
  }
}

run().catch(console.dir);
