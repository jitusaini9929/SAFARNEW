import { Router, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Get all moods for the current user
router.get('/', requireAuth, async (req: Request, res) => {
    try {
        const result = await db.execute({
            sql: 'SELECT * FROM moods WHERE user_id = ? ORDER BY timestamp DESC',
            args: [req.session.userId]
        });
        res.json(result.rows);
    } catch (error) {
        console.error('Get moods error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Create a new mood entry
router.post('/', requireAuth, async (req: Request, res) => {
    const { mood, intensity, notes } = req.body;

    if (!mood || !intensity) {
        return res.status(400).json({ message: 'Mood and intensity are required' });
    }

    try {
        const id = uuidv4();
        const userId = req.session.userId;

        await db.execute({
            sql: `INSERT INTO moods (id, user_id, mood, intensity, notes) VALUES (?, ?, ?, ?, ?)`,
            args: [id, userId, mood, intensity, notes || '']
        });

        // Update check_in streak
        await db.execute({
            sql: `UPDATE streaks SET check_in_streak = check_in_streak + 1, last_active_date = CURRENT_TIMESTAMP WHERE user_id = ?`,
            args: [userId]
        });

        res.status(201).json({
            id,
            userId,
            mood,
            intensity,
            notes,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Create mood error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export const moodRoutes = router;
