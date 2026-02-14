import { Router, Request } from 'express';
import bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { collections } from '../db';
import { requireAuth } from '../middleware/auth';
import { checkPerks } from './perks';

const router = Router();
const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const PASSWORD_RESET_MIN_PASSWORD_LENGTH = 8;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(key: string, limit: number, windowMs: number) {
    const now = Date.now();
    const bucket = rateLimitStore.get(key);

    if (!bucket || now > bucket.resetAt) {
        rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
        return { limited: false, retryAfterSec: 0 };
    }

    bucket.count += 1;
    rateLimitStore.set(key, bucket);

    if (bucket.count > limit) {
        const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
        return { limited: true, retryAfterSec };
    }

    return { limited: false, retryAfterSec: 0 };
}

function applyRateLimit(req: Request, res: any, keyPrefix: string, limit: number, windowMs: number) {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const key = `${keyPrefix}:${String(ip)}`;
    const { limited, retryAfterSec } = isRateLimited(key, limit, windowMs);

    if (limited) {
        res.setHeader('Retry-After', String(retryAfterSec));
        res.status(429).json({ message: 'Too many requests. Please try again later.' });
        return true;
    }

    return false;
}

function hashResetToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
}

function buildPasswordResetLink(req: Request, token: string) {
    const baseUrl =
        process.env.PASSWORD_RESET_BASE_URL ||
        process.env.APP_BASE_URL ||
        `${req.protocol}://${req.get('host')}`;
    const normalizedBase = baseUrl.replace(/\/+$/, '');
    return `${normalizedBase}/reset-password?token=${encodeURIComponent(token)}`;
}

async function sendPasswordResetEmail(email: string, resetLink: string) {
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFrom = process.env.RESEND_FROM_EMAIL;
    const subject = 'Reset your SAFAR password';
    const text = `Reset your SAFAR password using this link: ${resetLink}\nThis link expires in 1 hour.`;

    if (!resendApiKey || !resendFrom) {
        console.warn('[PASSWORD RESET] Email provider not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.');
        console.log(`[PASSWORD RESET] To: ${email}`);
        console.log(`[PASSWORD RESET] Link: ${resetLink}`);
        return;
    }

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: resendFrom,
            to: [email],
            subject,
            text,
            html: `<p>Reset your SAFAR password:</p><p><a href="${resetLink}">${resetLink}</a></p><p>This link expires in 1 hour.</p>`
        })
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Resend error: ${response.status} ${errorBody}`);
    }
}

// Signup
router.post('/signup', async (req: Request, res) => {
    const { name, email, password, examType, preparationStage, gender, profileImage } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        // Check if user exists
        const existing = await collections.users().findOne({ email });
        if (existing) {
            return res.status(400).json({ message: 'Email already in use' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = uuidv4();

        let avatarUrl: string;
        if (profileImage && profileImage.startsWith('data:image')) {
            avatarUrl = profileImage;
        } else {
            avatarUrl = 'https://www.gstatic.com/images/branding/product/1x/avatar_circle_blue_512dp.png';
        }

        await collections.users().insertOne({
            id: userId,
            name,
            email,
            password_hash: hashedPassword,
            avatar: avatarUrl,
            exam_type: examType || null,
            preparation_stage: preparationStage || null,
            gender: gender || null,
            selected_perk_id: null,
            selected_achievement_id: null,
            created_at: new Date(),
        });

        // Initialize streaks
        await collections.streaks().insertOne({
            id: uuidv4(),
            user_id: userId,
            login_streak: 0,
            check_in_streak: 0,
            goal_completion_streak: 0,
            last_active_date: new Date(),
        });

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
        console.log('🔵 [LOGIN] Querying user...');
        const user = await collections.users().findOne(
            { email },
            { projection: { id: 1, email: 1, password_hash: 1, name: 1, exam_type: 1, preparation_stage: 1, gender: 1 } }
        );

        console.log('🔵 [LOGIN] User found:', user ? 'Yes' : 'No');

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            console.log('🔴 [LOGIN] Invalid credentials');
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        console.log('🟢 [LOGIN] Password verified');

        req.session.userId = user.id;
        console.log('🟢 [LOGIN] Session userId set:', req.session.userId);

        // Update login streak (best effort)
        try {
            console.log('🔵 [LOGIN] Updating streaks...');
            await updateLoginStreak(user.id);
            console.log('🟢 [LOGIN] Streaks updated');

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
            avatar: 'https://www.gstatic.com/images/branding/product/1x/avatar_circle_blue_512dp.png',
            examType: user.exam_type,
            preparationStage: user.preparation_stage,
            gender: user.gender
        });
        console.log('🟢 [LOGIN] Response sent');
    } catch (error: any) {
        console.error('🔴 [LOGIN ERROR]:', error.message || error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Helper for streak updates
async function updateLoginStreak(userId: string) {
    const currentStreak = await collections.streaks().findOne({ user_id: userId });

    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const nowIST = new Date(now.getTime() + istOffset);
    const todayIST = nowIST.toISOString().split('T')[0];

    if (currentStreak && currentStreak.last_active_date) {
        const lastActiveDate = new Date(currentStreak.last_active_date);
        const lastActiveIST = new Date(lastActiveDate.getTime() + istOffset);
        const lastDateIST = lastActiveIST.toISOString().split('T')[0];

        if (currentStreak.login_streak === 0) {
            await collections.streaks().updateOne(
                { user_id: userId },
                { $set: { login_streak: 1, last_active_date: now } }
            );
        } else if (lastDateIST === todayIST) {
            // Already logged in today
        } else {
            const yesterday = new Date(nowIST);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayIST = yesterday.toISOString().split('T')[0];

            if (lastDateIST === yesterdayIST) {
                await collections.streaks().updateOne(
                    { user_id: userId },
                    { $inc: { login_streak: 1 }, $set: { last_active_date: now } }
                );
            } else {
                await collections.streaks().updateOne(
                    { user_id: userId },
                    { $set: { login_streak: 1, last_active_date: now } }
                );
            }
        }
    } else {
        await collections.streaks().updateOne(
            { user_id: userId },
            { $set: { login_streak: 1, last_active_date: now } }
        );
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

// Request password reset link
router.post('/forgot-password', async (req: Request, res) => {
    if (applyRateLimit(req, res, 'forgot-password', 5, 15 * 60 * 1000)) return;

    const email = String(req.body?.email || '').trim().toLowerCase();
    const genericMessage = 'If an account exists for that email, a reset link has been sent.';

    if (!email || !email.includes('@')) {
        return res.json({ message: genericMessage });
    }

    try {
        const user = await collections.users().findOne(
            { email: { $regex: new RegExp(`^${email}$`, 'i') } },
            { projection: { id: 1, email: 1 } }
        );

        if (user) {
            const rawToken = randomBytes(32).toString('hex');
            const tokenHash = hashResetToken(rawToken);
            const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);

            // Clean up old tokens
            await collections.passwordResetTokens().deleteMany({
                $or: [
                    { user_id: user.id },
                    { expires_at: { $lt: new Date() } },
                    { used_at: { $ne: null } },
                ]
            });

            await collections.passwordResetTokens().insertOne({
                id: uuidv4(),
                user_id: user.id,
                token_hash: tokenHash,
                expires_at: expiresAt,
                used_at: null,
                created_at: new Date(),
            });

            const resetLink = buildPasswordResetLink(req, rawToken);
            try {
                await sendPasswordResetEmail(String(user.email || email), resetLink);
            } catch (sendError) {
                console.error('Password reset email send failed:', sendError);
            }
        }

        return res.json({ message: genericMessage });
    } catch (error) {
        console.error('Forgot password error:', error);
        return res.json({ message: genericMessage });
    }
});

// Confirm password reset using one-time token
router.post('/reset-password/confirm', async (req: Request, res) => {
    if (applyRateLimit(req, res, 'reset-password-confirm', 10, 15 * 60 * 1000)) return;

    const token = String(req.body?.token || '').trim();
    const newPassword = String(req.body?.newPassword || '');

    if (!token || !newPassword) {
        return res.status(400).json({ message: 'Token and new password are required' });
    }

    if (newPassword.length < PASSWORD_RESET_MIN_PASSWORD_LENGTH) {
        return res.status(400).json({
            message: `Password must be at least ${PASSWORD_RESET_MIN_PASSWORD_LENGTH} characters`
        });
    }

    try {
        const tokenHash = hashResetToken(token);
        const tokenRow = await collections.passwordResetTokens().findOne({
            token_hash: tokenHash,
            used_at: null,
            expires_at: { $gt: new Date() },
        });

        if (!tokenRow) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await collections.users().updateOne(
            { id: tokenRow.user_id },
            { $set: { password_hash: hashedPassword } }
        );

        // Mark token as used
        await collections.passwordResetTokens().updateOne(
            { id: tokenRow.id },
            { $set: { used_at: new Date() } }
        );

        // Invalidate all other tokens for this user
        await collections.passwordResetTokens().updateMany(
            { user_id: tokenRow.user_id, used_at: null },
            { $set: { used_at: new Date() } }
        );

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset password confirm error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Deprecated insecure endpoints
router.post('/check-email', async (_req: Request, res) => {
    res.status(410).json({ message: 'Deprecated endpoint. Use /api/auth/forgot-password.' });
});

router.post('/reset-password', async (_req: Request, res) => {
    res.status(410).json({ message: 'Deprecated endpoint. Use /api/auth/reset-password/confirm.' });
});

// Get Current User
router.get('/me', requireAuth, async (req: Request, res) => {
    console.log('🔵 [ME] Request received, session userId:', req.session.userId);
    try {
        const user = await collections.users().findOne(
            { id: req.session.userId },
            { projection: { id: 1, email: 1, name: 1, exam_type: 1, preparation_stage: 1, gender: 1, avatar: 1, created_at: 1 } }
        );
        console.log('🔵 [ME] User found:', user ? 'Yes' : 'No');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const avatarUrl = user.avatar || 'https://www.gstatic.com/images/branding/product/1x/avatar_circle_blue_512dp.png';

        // Get streaks
        const streaks = await collections.streaks().findOne({ user_id: user.id });

        // Log daily activity in login_history (once per day)
        try {
            const now = new Date();
            const istOffset = 5.5 * 60 * 60 * 1000;
            const todayIST = new Date(now.getTime() + istOffset).toISOString().split('T')[0];

            const lastEntry = await collections.loginHistory().findOne(
                { user_id: user.id },
                { sort: { timestamp: -1 }, projection: { timestamp: 1 } }
            );

            let shouldInsert = true;
            if (lastEntry && lastEntry.timestamp) {
                let lastDate: Date;
                if (lastEntry.timestamp instanceof Date) {
                    lastDate = lastEntry.timestamp;
                } else {
                    const timestampStr = lastEntry.timestamp as string;
                    lastDate = new Date(timestampStr + (timestampStr.includes('Z') ? '' : 'Z'));
                }
                const lastDateIST = new Date(lastDate.getTime() + istOffset).toISOString().split('T')[0];
                if (lastDateIST === todayIST) {
                    shouldInsert = false;
                }
            }

            if (shouldInsert) {
                await collections.loginHistory().insertOne({
                    id: uuidv4(),
                    user_id: user.id,
                    timestamp: new Date(),
                });
                console.log('🟢 [ME] Logged daily activity for:', todayIST);
            }
        } catch (logError) {
            console.error('Failed to log daily activity:', logError);
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
        const rows = await collections.loginHistory()
            .find({ user_id: req.session.userId })
            .sort({ timestamp: -1 })
            .toArray();
        res.json(rows.map(r => ({ timestamp: r.timestamp })));
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
        const updates: Record<string, any> = {};

        if (name !== undefined) updates.name = name;
        if (examType !== undefined) updates.exam_type = examType;
        if (preparationStage !== undefined) updates.preparation_stage = preparationStage;
        if (gender !== undefined) updates.gender = gender;
        if (avatar !== undefined) updates.avatar = avatar;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        await collections.users().updateOne({ id: userId }, { $set: updates });

        const user = await collections.users().findOne({ id: userId });

        res.json({
            id: user!.id,
            name: user!.name,
            email: user!.email,
            avatar: user!.avatar,
            examType: user!.exam_type,
            preparationStage: user!.preparation_stage,
            gender: user!.gender
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export const authRoutes = router;
