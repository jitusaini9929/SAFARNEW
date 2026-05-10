import { MongoClient } from 'mongodb';

const MONGODB_URI = "mongodb://root:2azoqy8CFAjF16m3p4J5aKb5MlavOLuk83ArXLHGXBXv1aI8ddVEnYm0wO97rbMg@69.62.77.8:5433/?directConnection=true";
const DB_NAME = "safar";

async function checkComments() {
    console.log('Connecting to DB...');
    const client = new MongoClient(MONGODB_URI);
    try {
        await client.connect();
        const db = client.db(DB_NAME);

        console.log('--- Thoughts with comments_count > 0 ---');
        const thoughts = await db.collection('mehfil_thoughts').find({ comments_count: { $gt: 0 } }).toArray();
        if (thoughts.length === 0) {
            console.log('No thoughts with comments_count > 0 found.');
            const count = await db.collection('mehfil_thoughts').countDocuments();
            console.log(`Total thoughts in DB: ${count}`);
        }
        for (const t of thoughts) {
            console.log(`Thought ID: ${t.id}, Content: ${t.content.slice(0, 30)}..., Count: ${t.comments_count}`);
            const comments = await db.collection('mehfil_comments').find({ thought_id: t.id }).toArray();
            console.log(`  Actual comments found: ${comments.length}`);
            for (const c of comments) {
                console.log(`    Comment ID: ${c.id}, Content: ${c.content}`);
            }
        }

        console.log('\n--- Recent mehfil_comments (last 10) ---');
        const allComments = await db.collection('mehfil_comments').find({}).sort({ created_at: -1 }).limit(10).toArray();
        if (allComments.length === 0) {
            console.log('No comments found in mehfil_comments collection.');
        }
        for (const c of allComments) {
            console.log(`Comment ID: ${c.id}, Thought ID: ${c.thought_id}, Content: ${c.content}`);
        }

    } catch (err) {
        console.error('Error during DB check:', err);
    } finally {
        await client.close();
        process.exit(0);
    }
}

checkComments();
