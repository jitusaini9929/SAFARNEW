import { Router, Request } from 'express';
import { collections } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Get streak data for current user
router.get('/', requireAuth, async (req: Request, res) => {
    try {
        const streak = await collections.streaks().findOne({ user_id: req.session.userId });

        if (!streak) {
            return res.json({
                loginStreak: 0,
                checkInStreak: 0,
                goalCompletionStreak: 0,
                lastActiveDate: null
            });
        }

        res.json({
            loginStreak: streak.login_streak,
            checkInStreak: streak.check_in_streak,
            goalCompletionStreak: streak.goal_completion_streak,
            lastActiveDate: streak.last_active_date
        });
    } catch (error) {
        console.error('Get streaks error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export const streakRoutes = router;
