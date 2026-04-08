const { MongoClient, ObjectId } = require('mongodb');

const SOURCE_URI = 'mongodb://root:2azoqy8CFAjF16m3p4J5aKb5MlavOLuk83ArXLHGXBXv1aI8ddVEnYm0wO97rbMg@69.62.77.8:5433/?directConnection=true&authSource=admin';
const TARGET_URI = 'mongodb://root:PjI1CRdEQwZeBBk0WOKncU5rvVLQQEZ1WOQYu51G0PWDrKNgQs4NEs8HMuNPuKJQ@139.84.170.148:5432/?directConnection=true&authSource=admin';

async function syncUsers() {
    console.log("Starting missing users sync...");
    const s = new MongoClient(SOURCE_URI);
    const t = new MongoClient(TARGET_URI);
    
    try {
        await s.connect();
        await t.connect();
        
        const sd = s.db('safar').collection('users');
        const td = t.db('safar').collection('users');
        
        console.log("Fetching Source IDs...");
        const srcIds = await sd.find({}, { projection: { _id: 1 } }).toArray();
        const srcIdSet = new Set(srcIds.map(doc => doc._id.toString()));
        
        console.log("Fetching Target IDs...");
        const tgtIds = await td.find({}, { projection: { _id: 1 } }).toArray();
        const tgtIdSet = new Set(tgtIds.map(doc => doc._id.toString()));
        
        const missingIds = [];
        for (const id of srcIdSet) {
            if (!tgtIdSet.has(id)) {
                missingIds.push(id);
            }
        }
        
        console.log(`Found ${missingIds.length} missing users! sync starting...`);
        
        if (missingIds.length > 0) {
            const batchSize = 100;
            for (let i = 0; i < missingIds.length; i += batchSize) {
                const batchIds = missingIds.slice(i, i + batchSize).map(id => new ObjectId(id));
                const docs = await sd.find({ _id: { $in: batchIds } }).toArray();
                
                await td.insertMany(docs);
                console.log(`Inserted batch ${i} to ${i + docs.length}`);
            }
        }
        
        console.log("DONE syncing users!");
    } catch (err) {
        console.error("Error syncing users:", err);
    } finally {
        await s.close();
        await t.close();
    }
}

syncUsers();
