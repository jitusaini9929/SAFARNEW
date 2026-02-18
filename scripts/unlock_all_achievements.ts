
import { connectMongo, collections, getMongoClient } from '../server/db';
import { v4 as uuidv4 } from 'uuid';

async function unlockAll() {
    console.log('Connecting to DB...');
    await connectMongo();

    const targetEmail = "thatkindchic@gmail.com";
    console.log(`Finding user with email: ${targetEmail}`);

    const user = await collections.users().findOne({ email: targetEmail });

    if (!user) {
        console.error(`User not found: ${targetEmail}`);
        process.exit(1);
    }

    console.log(`Found user: ${user.id}`);

    // Get all definitions
    const definitions = await collections.achievementDefinitions().find({}).toArray();
    console.log(`Found ${definitions.length} achievement definitions.`);

    let count = 0;
    for (const def of definitions) {
        await collections.userAchievements().updateOne(
            { user_id: user.id, achievement_id: def.id },
            {
                $set: {
                    is_active: true,
                    acquired_at: new Date(),
                    achievement_id: def.id,
                    user_id: user.id
                },
                $setOnInsert: { id: uuidv4() }
            },
            { upsert: true }
        );
        count++;
    }

    console.log(`✅ Successfully unlocked ${count} achievements/titles for ${targetEmail}`);

    // Close connection
    await getMongoClient().close();
    process.exit(0);
}

unlockAll().catch(console.error);
