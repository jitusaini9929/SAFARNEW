import { Router, Request } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Signup
router.post('/signup', async (req: Request, res) => {
    const { name, email, password, examType, preparationStage, gender } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        // Check if user exists
        const existingResult = await db.execute({
            sql: 'SELECT id FROM users WHERE email = ?',
            args: [email]
        });
        if (existingResult.rows.length > 0) {
            return res.status(400).json({ message: 'Email already in use' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = uuidv4();

        // Generate avatar based on gender
        let avatarSeed = email; // default seed
        let avatarStyle = 'avataaars'; // default style

        if (gender === 'male') {
            // Use a style that tends to look masculine or use specific seeds if needed, 
            // but 'avataaars' is gender neutral by default. 
            // Let's use 'micah' or specific seeds or just rely on 'avataaars' being diverse.
            // Better: Use 'adventurer' or 'micah' which have distinct looks, OR stick to avataaars 
            // and maybe append gender to seed to vary it?
            // Actually, the user asked for "assign avatar according to that".
            // Let's use 'pixel-art' or 'avataaars' with a prefix to the seed to ensure variety?
            // Or better, let's use:
            // Male -> https://api.dicebear.com/7.x/avataaars/svg?seed=${email}&gender=male (avataaars doesn't strictly support gender param like that)
            // Let's use 'adventurer' (neutral but nice) or just keep avataaars.
            // Simpler approach:
            // Male: https://api.dicebear.com/7.x/avataaars/svg?seed=${email}&eyebrows=default&mouth=smile
            // Female: https://api.dicebear.com/7.x/avataaars/svg?seed=${email}&top=longHair

            // Even simpler and more effective:
            // Male: https://api.dicebear.com/7.x/miniavs/svg?seed=${email}&gender=male (Miniavs supports gender!)
            // Wait, checking DiceBear docs... 'personas' or 'avataaars'.
            // Let's use 'avataaars' and just modify the URL slightly or use a different collection?
            // No, let's use user preference.

            // Logic:
            // If male: seed = name + "male"
            // If female: seed = name + "female"
            // This changes the avatar but doesn't guarantee visual gender.

            // User wants specific avatars. Let's use:
            // https://api.dicebear.com/9.x/avataaars/svg?seed=${email}
            // But we can customize options.

            // Let's try to imply gender via options if possible, or just accept that random seed is random.
            // HOWEVER, we can use specific collections.
            // Let's use `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}&topChance=80` etc.

            // Actually, let's just stick to the requested logic:
            // If gender is male, maybe use `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}&facialHair[]`...

            // Simplest working solution for "Male/Female" distinction:
            // Female: https://api.dicebear.com/7.x/avataaars/svg?seed=${email}&top=longHair,longHairBob,longHairBun,longHairCurly,longHairCurvy,longHairDreads,longHairFrida,longHairFro,longHairFroBand,longHairMiaWallace,longHairNotTooLong,longHairShavedSides,longHairStraight,longHairStraight2,longHairStraightStrand
            // Male: https://api.dicebear.com/7.x/avataaars/svg?seed=${email}&top=shortHair,shortHairCaesar,shortHairCaesarSidePart,shortHairDreads01,shortHairDreads02,shortHairFrizzle,shortHairShaggyMullet,shortHairShortCurly,shortHairShortFlat,shortHairShortRound,shortHairShortWaved,shortHairSides,shortHairTheCaesar,shortHairTheCaesarSidePart

            // That's too long for a clear URL. 
            // Let's use 'adventurer' for everyone but vary the seed? No.

            // Let's use:
            // Male: https://api.dicebear.com/7.x/avataaars/svg?seed=${email}&facialHairProbability=80&topProbability=80
            // Female: https://api.dicebear.com/7.x/avataaars/svg?seed=${email}&facialHairProbability=0&top[]=longHair&top[]=longHairBob&top[]=longHairBun&top[]=longHairCurly&top[]=longHairCurvy
        }

        let avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`;

        if (gender === 'male') {
            // Force short hair and maybe facial hair
            avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}&top=shortHair,shortHairCaesar,shortHairCaesarSidePart,shortHairDreads01,shortHairDreads02,shortHairFrizzle,shortHairShaggyMullet,shortHairShortCurly,shortHairShortFlat,shortHairShortRound,shortHairShortWaved,shortHairSides,shortHairTheCaesar,shortHairTheCaesarSidePart&facialHairProbability=60`;
        } else if (gender === 'female') {
            // Force long hair, no facial hair
            avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}&top=longHair,longHairBob,longHairBun,longHairCurly,longHairCurvy,longHairDreads,longHairFrida,longHairFro,longHairFroBand,longHairMiaWallace,longHairNotTooLong,longHairShavedSides,longHairStraight,longHairStraight2,longHairStraightStrand&facialHairProbability=0`;
        }

        await db.execute({
            sql: `INSERT INTO users (id, name, email, password_hash, avatar, exam_type, preparation_stage, gender)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [userId, name, email, hashedPassword, avatarUrl, examType || null, preparationStage || null, gender || null]
        });

        // Initialize streaks
        await db.execute({
            sql: `INSERT INTO streaks (id, user_id, login_streak, check_in_streak, goal_completion_streak, last_active_date)
                  VALUES (?, ?, 0, 0, 0, CURRENT_TIMESTAMP)`,
            args: [uuidv4(), userId]
        });

        // Set session
        req.session.userId = userId;

        res.status(201).json({
            id: userId,
            name,
            email,
            avatar: avatarUrl,
            examType,
            preparationStage,
            gender
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Login
router.post('/login', async (req: Request, res) => {
    console.log('🔵 [LOGIN] Request received:', { email: req.body.email });
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Missing credentials' });
    }

    try {
        const result = await db.execute({
            sql: 'SELECT * FROM users WHERE email = ?',
            args: [email]
        });
        const user = result.rows[0] as any;
        console.log('🔵 [LOGIN] User found:', user ? 'Yes' : 'No');

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            console.log('🔴 [LOGIN] Invalid credentials');
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Update login streak (once per day only, IST timezone)
        const streakResult = await db.execute({
            sql: 'SELECT * FROM streaks WHERE user_id = ?',
            args: [user.id]
        });
        const currentStreak = streakResult.rows[0] as any;

        // Get current date in IST (UTC+5:30)
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in ms
        const nowIST = new Date(now.getTime() + istOffset);
        const todayIST = nowIST.toISOString().split('T')[0]; // YYYY-MM-DD

        if (currentStreak && currentStreak.last_active_date) {
            const lastActiveDate = new Date(currentStreak.last_active_date);
            const lastActiveIST = new Date(lastActiveDate.getTime() + istOffset);
            const lastDateIST = lastActiveIST.toISOString().split('T')[0];

            // First login ever (streak is 0 from signup), set to 1
            if (currentStreak.login_streak === 0) {
                await db.execute({
                    sql: `UPDATE streaks SET login_streak = 1, last_active_date = ? WHERE user_id = ?`,
                    args: [now.toISOString(), user.id]
                });
                console.log('🟢 [LOGIN] First login after signup, streak set to 1');
            } else if (lastDateIST === todayIST) {
                // Already logged in today, don't increment streak
                console.log('🟡 [LOGIN] Already logged in today, streak unchanged');
            } else {
                // Check if yesterday (to maintain streak) or gap (reset streak)
                const yesterday = new Date(nowIST);
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayIST = yesterday.toISOString().split('T')[0];

                if (lastDateIST === yesterdayIST) {
                    // Consecutive day, increment streak
                    await db.execute({
                        sql: `UPDATE streaks SET login_streak = login_streak + 1, last_active_date = ? WHERE user_id = ?`,
                        args: [now.toISOString(), user.id]
                    });
                    console.log('🟢 [LOGIN] Streak incremented (consecutive day)');
                } else {
                    // Missed days, reset streak to 1
                    await db.execute({
                        sql: `UPDATE streaks SET login_streak = 1, last_active_date = ? WHERE user_id = ?`,
                        args: [now.toISOString(), user.id]
                    });
                    console.log('🟠 [LOGIN] Streak reset to 1 (missed days)');
                }
            }
        } else {
            // First login ever, set streak to 1
            await db.execute({
                sql: `UPDATE streaks SET login_streak = 1, last_active_date = ? WHERE user_id = ?`,
                args: [now.toISOString(), user.id]
            });
            console.log('🟢 [LOGIN] First login, streak set to 1');
        }

        req.session.userId = user.id;
        console.log('🟢 [LOGIN] Session userId set:', req.session.userId);

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            examType: user.exam_type,
            preparationStage: user.preparation_stage
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Logout
router.post('/logout', (req: Request, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Could not log out' });
        }
        res.clearCookie('nistha.sid');
        res.json({ message: 'Logged out successfully' });
    });
});

// Get Current User
router.get('/me', requireAuth, async (req: Request, res) => {
    console.log('🔵 [ME] Request received, session userId:', req.session.userId);
    try {
        const userResult = await db.execute({
            sql: 'SELECT * FROM users WHERE id = ?',
            args: [req.session.userId]
        });
        const user = userResult.rows[0] as any;
        console.log('🔵 [ME] User found:', user ? 'Yes' : 'No');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get streaks
        const streaksResult = await db.execute({
            sql: 'SELECT * FROM streaks WHERE user_id = ?',
            args: [user.id]
        });
        const streaks = streaksResult.rows[0] as any;

        // Log daily activity in login_history (once per day)
        try {
            const now = new Date();
            const istOffset = 5.5 * 60 * 60 * 1000;
            const todayIST = new Date(now.getTime() + istOffset).toISOString().split('T')[0];

            const historyCheck = await db.execute({
                sql: "SELECT timestamp FROM login_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT 1",
                args: [user.id]
            });

            let shouldInsert = true;
            if (historyCheck.rows.length > 0) {
                const lastTimestamp = historyCheck.rows[0].timestamp as string;
                // Treat DB timestamp as UTC (automatically handled by Date usually if ISO string)
                // If DB stores as "YYYY-MM-DD HH:MM:SS" without Z, it might be treated as local or UTC. 
                // Turso/SQLite CURRENT_TIMESTAMP is UTC "YYYY-MM-DD HH:MM:SS".
                const lastDate = new Date(lastTimestamp + (lastTimestamp.includes('Z') ? '' : 'Z'));
                const lastDateIST = new Date(lastDate.getTime() + istOffset).toISOString().split('T')[0];

                if (lastDateIST === todayIST) {
                    shouldInsert = false;
                }
            }

            if (shouldInsert) {
                await db.execute({
                    sql: "INSERT INTO login_history (id, user_id) VALUES (?, ?)",
                    args: [uuidv4(), user.id]
                });
                console.log('🟢 [ME] Logged daily activity for:', todayIST);
            }
        } catch (logError) {
            console.error('Failed to log daily activity:', logError);
            // Don't block the actual response
        }

        res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                examType: user.exam_type,
                preparationStage: user.preparation_stage
            },
            streaks: {
                loginStreak: streaks?.login_streak || 0,
                checkInStreak: streaks?.check_in_streak || 0,
                goalCompletionStreak: streaks?.goal_completion_streak || 0,
                lastActiveDate: streaks?.last_active_date
            }
        });
        console.log('🟢 [ME] Sending response with user and streaks');

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get Login History
router.get('/login-history', requireAuth, async (req: Request, res) => {
    try {
        const result = await db.execute({
            sql: 'SELECT timestamp FROM login_history WHERE user_id = ? ORDER BY timestamp DESC',
            args: [req.session.userId]
        });
        res.json(result.rows);
    } catch (error) {
        console.error('Get login history error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update Profile
router.patch('/profile', requireAuth, async (req: Request, res) => {
    const { name, examType, preparationStage } = req.body;
    const userId = req.session.userId;

    try {
        const updates: string[] = [];
        const values: any[] = [];

        if (name !== undefined) {
            updates.push('name = ?');
            values.push(name);
        }
        if (examType !== undefined) {
            updates.push('exam_type = ?');
            values.push(examType);
        }
        if (preparationStage !== undefined) {
            updates.push('preparation_stage = ?');
            values.push(preparationStage);
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        values.push(userId);
        const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
        await db.execute({ sql, args: values });

        // Return updated user
        const userResult = await db.execute({
            sql: 'SELECT * FROM users WHERE id = ?',
            args: [userId]
        });
        const user = userResult.rows[0] as any;

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            examType: user.exam_type,
            preparationStage: user.preparation_stage
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export const authRoutes = router;
