import { MongoClient } from 'mongodb';

const MONGODB_URI = "mongodb://root:2azoqy8CFAjF16m3p4J5aKb5MlavOLuk83ArXLHGXBXv1aI8ddVEnYm0wO97rbMg@69.62.77.8:5433/?directConnection=true";
const DB_NAME = "safar";

async function listCollections() {
    console.log('Connecting to DB...');
    const client = new MongoClient(MONGODB_URI);
    try {
        await client.connect();
        const db = client.db(DB_NAME);

        const collections = await db.listCollections().toArray();
        console.log('--- Collections in DB ---');
        for (const col of collections) {
            const count = await db.collection(col.name).countDocuments();
            console.log(`${col.name}: ${count} documents`);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.close();
        process.exit(0);
    }
}

listCollections();
