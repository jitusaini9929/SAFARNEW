import { Router, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Get all goals
router.get('/', requireAuth, async (req: Request, res) => {
    try {
        const result = await db.execute({
            sql: 'SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC',
            args: [req.session.userId]
        });
        res.json(result.rows);
    } catch (error) {
        console.error('Get goals error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Create goal
router.post('/', requireAuth, async (req: Request, res) => {
    const { text, type } = req.body;

    if (!text || !type) {
        return res.status(400).json({ message: 'Text and type are required' });
    }

    try {
        const id = uuidv4();
        const userId = req.session.userId;

        await db.execute({
            sql: `INSERT INTO goals (id, user_id, text, type, completed) VALUES (?, ?, ?, ?, 0)`,
            args: [id, userId, text, type]
        });

        res.status(201).json({
            id,
            userId,
            text,
            type,
            completed: false,
            createdAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Create goal error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update goal (toggle completion)
router.patch('/:id', requireAuth, async (req: Request, res) => {
    const { id } = req.params;
    const { completed } = req.body;
    const userId = req.session.userId;

    try {
        const completedAt = completed ? new Date().toISOString() : null;

        const result = await db.execute({
            sql: `UPDATE goals SET completed = ?, completed_at = ? WHERE id = ? AND user_id = ?`,
            args: [completed ? 1 : 0, completedAt, id, userId]
        });

        if (result.rowsAffected === 0) {
            return res.status(404).json({ message: 'Goal not found or unauthorized' });
        }

        // Update goal completion streak if completed
        if (completed) {
            await db.execute({
                sql: `UPDATE streaks SET goal_completion_streak = goal_completion_streak + 1 WHERE user_id = ?`,
                args: [userId]
            });
        }

        res.json({ message: 'Goal updated', completed, completedAt });
    } catch (error) {
        console.error('Update goal error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Delete goal
router.delete('/:id', requireAuth, async (req: Request, res) => {
    const { id } = req.params;
    const userId = req.session.userId;

    try {
        const result = await db.execute({
            sql: 'DELETE FROM goals WHERE id = ? AND user_id = ?',
            args: [id, userId]
        });

        if (result.rowsAffected === 0) {
            return res.status(404).json({ message: 'Goal not found or unauthorized' });
        }

        res.json({ message: 'Goal deleted' });
    } catch (error) {
        console.error('Delete goal error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export const goalRoutes = router;
