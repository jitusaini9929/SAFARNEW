const { MongoClient } = require('mongodb');

async function check() {
    const client = new MongoClient('mongodb://localhost:27017');
    await client.connect();
    const db = client.db('safar');
    const goals = await db.collection('goals').find({ title: /fdget/ }).toArray();
    console.log(JSON.stringify(goals, null, 2));
    await client.close();
}
check();

test();
