import { Router, Request } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { requireAuth } from '../middleware/auth';
import { checkPerks } from './perks';

const router = Router();

// Signup
router.post('/signup', async (req: Request, res) => {
    const { name, email, password, examType, preparationStage, gender, profileImage } = req.body;

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

        // Determine avatar: Use user-uploaded image if provided, otherwise use common default avatar
        let avatarUrl: string;

        if (profileImage && profileImage.startsWith('data:image')) {
            // User uploaded a custom profile image (base64 data URL)
            avatarUrl = profileImage;
        } else {
            // Common default avatar for all users (blue silhouette - Google style)
            avatarUrl = 'https://www.gstatic.com/images/branding/product/1x/avatar_circle_blue_512dp.png';
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
router.post('/login', async (req: any, res) => {
    console.log('🔵 [LOGIN] Request received:', { email: req.body.email });
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Missing credentials' });
    }

    try {
        console.log('🔵 [LOGIN] Pinging database...');
        await db.execute('SELECT 1');
        console.log('🟢 [LOGIN] Database ping successful');

        console.log('🔵 [LOGIN] Querying user (manual columns, excluding avatar)...');

        // Safety wrap for DB query to see if it actually returns
        const queryPromise = db.execute({
            sql: 'SELECT id, email, password_hash, name, exam_type, preparation_stage, gender FROM users WHERE email = ?',
            args: [email]
        });

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('DATABASE_QUERY_TIMEOUT')), 5000)
        );

        const result = await Promise.race([queryPromise, timeoutPromise]) as any;

        const user = result.rows[0] as any;
        console.log('🔵 [LOGIN] User found:', user ? 'Yes' : 'No');

        console.log('🔵 [LOGIN] Verifying password...');
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            console.log('🔴 [LOGIN] Invalid credentials');
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        console.log('🟢 [LOGIN] Password verified');

        // Set session immediately
        req.session.userId = user.id;
        console.log('🟢 [LOGIN] Session userId set:', req.session.userId);

        // Update login streak (Best effort - don't block login if this fails)
        try {
            console.log('🔵 [LOGIN] Updating streaks...');
            await updateLoginStreak(user.id);
            console.log('🟢 [LOGIN] Streaks updated');

            // Check and award perks based on current stats
            try {
                await checkPerks(user.id, 'login');
                console.log('🟢 [LOGIN] Perks checked');
            } catch (perkError) {
                console.error('🟠 [LOGIN] Perk check failed (non-fatal):', perkError);
            }
        } catch (streakError) {
            console.error('🟠 [LOGIN] Streak update failed (non-fatal):', streakError);
        }

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: 'https://www.gstatic.com/images/branding/product/1x/avatar_circle_blue_512dp.png', // Placeholder for test
            examType: user.exam_type,
            preparationStage: user.preparation_stage,
            gender: user.gender
        });
        console.log('🟢 [LOGIN] Response sent');
    } catch (error: any) {
        console.error('🔴 [LOGIN ERROR]:', error.message || error);
        if (error.message === 'DATABASE_QUERY_TIMEOUT') {
            return res.status(504).json({ message: 'Database query timed out' });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Helper for streak updates
async function updateLoginStreak(userId: string) {
    const streakResult = await db.execute({
        sql: 'SELECT * FROM streaks WHERE user_id = ?',
        args: [userId]
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
                args: [now.toISOString(), userId]
            });
        } else if (lastDateIST === todayIST) {
            // Already logged in today, don't increment streak
        } else {
            // Check if yesterday (to maintain streak) or gap (reset streak)
            const yesterday = new Date(nowIST);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayIST = yesterday.toISOString().split('T')[0];

            if (lastDateIST === yesterdayIST) {
                // Consecutive day, increment streak
                await db.execute({
                    sql: `UPDATE streaks SET login_streak = login_streak + 1, last_active_date = ? WHERE user_id = ?`,
                    args: [now.toISOString(), userId]
                });
            } else {
                // Missed days, reset streak to 1
                await db.execute({
                    sql: `UPDATE streaks SET login_streak = 1, last_active_date = ? WHERE user_id = ?`,
                    args: [now.toISOString(), userId]
                });
            }
        }
    } else {
        // First login ever (or missing streak record), set streak to 1
        await db.execute({
            sql: `UPDATE streaks SET login_streak = 1, last_active_date = ? WHERE user_id = ?`,
            args: [now.toISOString(), userId]
        });
    }
}

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

// Check if email exists (for password reset)
router.post('/check-email', async (req: Request, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ exists: false, message: 'Email is required' });
    }

    try {
        const result = await db.execute({
            sql: 'SELECT id FROM users WHERE email = ?',
            args: [email]
        });
        res.json({ exists: result.rows.length > 0 });
    } catch (error) {
        console.error('Check email error:', error);
        res.status(500).json({ exists: false, message: 'Internal server error' });
    }
});

// Reset password
router.post('/reset-password', async (req: Request, res) => {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
        return res.status(400).json({ message: 'Email and new password are required' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    try {
        // Check if user exists
        const userResult = await db.execute({
            sql: 'SELECT id FROM users WHERE email = ?',
            args: [email]
        });

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'No account found with this email' });
        }

        // Hash new password and update
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.execute({
            sql: 'UPDATE users SET password_hash = ? WHERE email = ?',
            args: [hashedPassword, email]
        });

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get Current User
router.get('/me', requireAuth, async (req: Request, res) => {
    console.log('🔵 [ME] Request received, session userId:', req.session.userId);
    try {
        // Query user without avatar to avoid timeout with large base64 images
        const userResult = await db.execute({
            sql: 'SELECT id, email, name, exam_type, preparation_stage, gender, created_at FROM users WHERE id = ?',
            args: [req.session.userId]
        });
        const user = userResult.rows[0] as any;
        console.log('🔵 [ME] User found:', user ? 'Yes' : 'No');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Fetch avatar separately with fallback
        let avatarUrl = 'https://www.gstatic.com/images/branding/product/1x/avatar_circle_blue_512dp.png';
        try {
            const avatarResult = await db.execute({
                sql: 'SELECT avatar FROM users WHERE id = ?',
                args: [user.id]
            });
            if (avatarResult.rows.length > 0) {
                const avatarRow = avatarResult.rows[0] as any;
                avatarUrl = avatarRow.avatar || avatarUrl;
            }
        } catch (avatarError) {
            console.warn('⚠️ [ME] Avatar fetch failed, using default');
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
                const lastTimestamp = historyCheck.rows[0].timestamp as any;
                let lastDate: Date;

                if (lastTimestamp instanceof Date) {
                    lastDate = lastTimestamp;
                } else {
                    const timestampStr = lastTimestamp as string;
                    lastDate = new Date(timestampStr + (timestampStr.includes('Z') ? '' : 'Z'));
                }

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
                avatar: avatarUrl,
                examType: user.exam_type,
                preparationStage: user.preparation_stage,
                gender: user.gender
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
    const { name, examType, preparationStage, gender, avatar } = req.body;
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
        if (gender !== undefined) {
            updates.push('gender = ?');
            values.push(gender);
        }
        if (avatar !== undefined) {
            updates.push('avatar = ?');
            values.push(avatar);
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        values.push(userId);
        const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
        console.log('📝 [PROFILE UPDATE] SQL:', sql, 'Values:', values);
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
            preparationStage: user.preparation_stage,
            gender: user.gender
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export const authRoutes = router;
