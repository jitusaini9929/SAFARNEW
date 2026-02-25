import { Router, Request } from 'express';
import bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';
import { collections } from '../db';
import { requireAuth } from '../middleware/auth';
import { checkPerks } from './perks';

const router = Router();
const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const PASSWORD_RESET_MIN_PASSWORD_LENGTH = 8;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const ALLOWED_SIGNUP_DOMAINS = new Set(['gmail.com', 'outlook.com']);
const SIGNUP_EMAIL_EXCEPTION = 'steve123@example.com';

function normalizeEmail(input: unknown): string {
    return String(input || '').trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isAllowedSignupEmail(email: string): boolean {
    if (email === SIGNUP_EMAIL_EXCEPTION) return true;
    const domain = email.split('@')[1] || '';
    return ALLOWED_SIGNUP_DOMAINS.has(domain);
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findUserByEmailInsensitive(
    email: string,
    projection?: Record<string, 0 | 1>
) {
    const escapedEmail = escapeRegExp(email);
    const exactRegex = new RegExp(`^${escapedEmail}$`, 'i');
    const looseRegex = new RegExp(`^\\s*${escapedEmail}\\s*$`, 'i');

    return collections.users().findOne(
        {
            $or: [
                { email },
                { email: exactRegex },
                { email: looseRegex },
            ],
        },
        projection ? { projection } : undefined
    );
}

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
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;
    const gmailFrom = process.env.GMAIL_FROM_EMAIL || `SAFAR Support <${gmailUser}>`;
    const smtpHost = process.env.GMAIL_SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = Number(process.env.GMAIL_SMTP_PORT || 465);

    const subject = 'Reset your SAFAR password';
    const text = `Reset your SAFAR password using this link: ${resetLink}\nThis link expires in 1 hour.`;
    const html = `<p>Reset your SAFAR password:</p><p><a href="${resetLink}">${resetLink}</a></p><p>This link expires in 1 hour.</p>`;

    if (!gmailUser || !gmailPass) {
        throw new Error('No email service configured. Set GMAIL_USER and GMAIL_APP_PASSWORD.');
    }

    console.log('[PASSWORD RESET] Sending email via Gmail SMTP...');
    const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
            user: gmailUser,
            pass: gmailPass
        }
    });

    const info = await transporter.sendMail({
        from: gmailFrom,
        to: email,
        subject,
        text,
        html
    });

    console.log('[PASSWORD RESET] Email sent via Gmail:', info.messageId);
}

// Signup
router.post('/signup', async (req: Request, res) => {
    const { name, password, examType, preparationStage, gender, profileImage } = req.body;
    const normalizedEmail = normalizeEmail(req.body?.email);

    if (!name || !normalizedEmail || !password) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!isValidEmail(normalizedEmail)) {
        return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    try {
        // Check if user exists (case-insensitive)
        const existing = await findUserByEmailInsensitive(normalizedEmail, { id: 1 });
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
            email: normalizedEmail,
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
            last_login_date: null,
            last_check_in_date: null,
            last_goal_completion_date: null,
            last_active_date: new Date(),
        });

        req.session.userId = userId;

        res.status(201).json({
            id: userId,
            name,
            email: normalizedEmail,
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
    console.log('[LOGIN] Request received:', { email: req.body.email });
    const normalizedEmail = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');

    if (!normalizedEmail || !password) {
        return res.status(400).json({ message: 'Missing credentials' });
    }

    if (!isValidEmail(normalizedEmail)) {
        return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    if (!isAllowedSignupEmail(normalizedEmail)) {
        return res.status(400).json({
            message: 'Registration is currently allowed only with Gmail or Outlook email addresses.'
        });
    }

    try {
        console.log('[LOGIN] Querying user candidates...');
        const escapedEmail = escapeRegExp(normalizedEmail);
        const exactRegex = new RegExp(`^${escapedEmail}$`, 'i');
        const looseRegex = new RegExp(`^\\s*${escapedEmail}\\s*$`, 'i');

        const candidates = await collections.users()
            .find(
                {
                    $or: [
                        { email: normalizedEmail },
                        { email: exactRegex },
                        { email: looseRegex },
                    ],
                },
                {
                    projection: {
                        id: 1,
                        email: 1,
                        password_hash: 1,
                        password: 1,
                        name: 1,
                        exam_type: 1,
                        preparation_stage: 1,
                        gender: 1,
                        created_at: 1,
                    },
                }
            )
            .sort({ created_at: -1 })
            .limit(20)
            .toArray();

        console.log('[LOGIN] Candidate count:', candidates.length);

        let authenticatedUser: any = null;
        let usedLegacyPassword = false;

        for (const candidate of candidates) {
            let passwordMatches = false;

            if (typeof candidate.password_hash === 'string' && candidate.password_hash) {
                try {
                    passwordMatches = await bcrypt.compare(password, candidate.password_hash);
                } catch (compareError) {
                    console.error('[LOGIN] bcrypt compare failed for candidate (non-fatal):', compareError);
                }
            }

            // Legacy fallback for historical rows that may have stored plain "password" field.
            if (!passwordMatches && typeof (candidate as any).password === 'string' && (candidate as any).password) {
                passwordMatches = password === (candidate as any).password;
                if (passwordMatches) {
                    usedLegacyPassword = true;
                }
            }

            if (passwordMatches) {
                authenticatedUser = candidate;
                break;
            }
        }

        if (!authenticatedUser) {
            console.log('[LOGIN] Invalid credentials');
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        console.log('[LOGIN] Password verified');

        if (usedLegacyPassword) {
            try {
                const upgradedHash = await bcrypt.hash(password, 10);
                await collections.users().updateOne(
                    { id: authenticatedUser.id },
                    {
                        $set: { password_hash: upgradedHash, email: normalizedEmail },
                        $unset: { password: '' }
                    }
                );
            } catch (migrationError) {
                console.error('[LOGIN] Legacy password migration failed (non-fatal):', migrationError);
            }
        }

        // Normalize stored email after successful login so future lookups are consistent.
        if (String((authenticatedUser as any).email || '') !== normalizedEmail) {
            try {
                await collections.users().updateOne({ id: (authenticatedUser as any).id }, { $set: { email: normalizedEmail } });
                (authenticatedUser as any).email = normalizedEmail;
            } catch (emailUpdateError) {
                console.error('[LOGIN] Email normalization update failed (non-fatal):', emailUpdateError);
            }
        }

        req.session.userId = authenticatedUser.id;

        // Always use 30-day sessions - matching the global session cookie config.
        // Rolling sessions (rolling: true) auto-renew on activity, so active
        // users are never logged out without explicitly logging out themselves.
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days always

        console.log(`[LOGIN] Session userId set: ${req.session.userId}, MaxAge: ${req.session.cookie.maxAge}`);

        // Update login streak (best effort)
        try {
            console.log('[LOGIN] Updating streaks...');
            await updateLoginStreak(authenticatedUser.id);
            console.log('[LOGIN] Streaks updated');

            try {
                await checkPerks(authenticatedUser.id, 'login');
                console.log('[LOGIN] Perks checked');
            } catch (perkError) {
                console.error('[LOGIN] Perk check failed (non-fatal):', perkError);
            }
        } catch (streakError) {
            console.error('[LOGIN] Streak update failed (non-fatal):', streakError);
        }

        res.json({
            id: authenticatedUser.id,
            name: authenticatedUser.name,
            email: authenticatedUser.email,
            avatar: 'https://www.gstatic.com/images/branding/product/1x/avatar_circle_blue_512dp.png',
            examType: authenticatedUser.exam_type,
            preparationStage: authenticatedUser.preparation_stage,
            gender: authenticatedUser.gender
        });
        console.log('[LOGIN] Response sent');
    } catch (error: any) {
        console.error('[LOGIN ERROR]:', error.message || error);
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

    if (currentStreak) {
        const lastLoginRaw = currentStreak.last_login_date ?? currentStreak.last_active_date ?? null;
        const lastLoginDate = lastLoginRaw ? new Date(lastLoginRaw) : null;
        const lastLoginIST = lastLoginDate ? new Date(lastLoginDate.getTime() + istOffset) : null;
        const lastDateIST = lastLoginIST ? lastLoginIST.toISOString().split('T')[0] : null;

        if (currentStreak.login_streak === 0) {
            await collections.streaks().updateOne(
                { user_id: userId },
                { $set: { login_streak: 1, last_login_date: now, last_active_date: now } }
            );
        } else if (lastDateIST === todayIST) {
            await collections.streaks().updateOne(
                { user_id: userId },
                { $set: { last_login_date: now, last_active_date: now } }
            );
        } else {
            const yesterday = new Date(nowIST);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayIST = yesterday.toISOString().split('T')[0];

            if (lastDateIST === yesterdayIST) {
                await collections.streaks().updateOne(
                    { user_id: userId },
                    { $inc: { login_streak: 1 }, $set: { last_login_date: now, last_active_date: now } }
                );
            } else {
                await collections.streaks().updateOne(
                    { user_id: userId },
                    { $set: { login_streak: 1, last_login_date: now, last_active_date: now } }
                );
            }
        }
    } else {
        await collections.streaks().updateOne(
            { user_id: userId },
            { $set: { login_streak: 1, last_login_date: now, last_active_date: now } },
            { upsert: true }
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

    const email = normalizeEmail(req.body?.email);

    if (!email || !isValidEmail(email)) {
        return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    try {
        const user = await findUserByEmailInsensitive(
            email,
            { id: 1, email: 1 }
        );

        if (!user) {
            return res.status(404).json({
                message: 'The account has not been registered, please register first.'
            });
        }

        const rawToken = randomBytes(32).toString('hex');
        const tokenHash = hashResetToken(rawToken);
        const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);
        const tokenId = uuidv4();

        // Clean up old tokens
        await collections.passwordResetTokens().deleteMany({
            $or: [
                { user_id: user.id },
                { expires_at: { $lt: new Date() } },
                { used_at: { $ne: null } },
            ]
        });

        await collections.passwordResetTokens().insertOne({
            id: tokenId,
            user_id: user.id,
            token_hash: tokenHash,
            expires_at: expiresAt,
            used_at: null,
            created_at: new Date(),
        });

        const resetLink = buildPasswordResetLink(req, rawToken);

        try {
            await sendPasswordResetEmail(String((user as any).email || email), resetLink);
        } catch (sendError) {
            await collections.passwordResetTokens().deleteOne({ id: tokenId });
            console.error('Password reset email send failed:', sendError);
            return res.status(503).json({
                message: 'Password reset email service is temporarily unavailable. Please try again shortly.'
            });
        }

        return res.json({ message: 'Reset link sent. Please check your email inbox.' });
    } catch (error) {
        console.error('Forgot password error:', error);
        return res.status(500).json({ message: 'Failed to process password reset request' });
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

        // Update login streak (eagerly updating on session restore)
        try {
            await updateLoginStreak(user.id);
        } catch (streakError) {
            console.error('[ME] Streak update failed (non-fatal):', streakError);
        }

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

