import { Router, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { collections } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Get all journal entries
router.get('/', requireAuth, async (req: Request, res) => {
    try {
        const rows = await collections.journal()
            .find({ user_id: req.session.userId })
            .sort({ timestamp: -1 })
            .toArray();
        res.json(rows);
    } catch (error) {
        console.error('Get journal error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Create entry
router.post('/', requireAuth, async (req: Request, res) => {
    const { content } = req.body;

    if (!content) {
        return res.status(400).json({ message: 'Content is required' });
    }

    try {
        const id = uuidv4();
        const userId = req.session.userId!;
        const now = new Date();

        await collections.journal().insertOne({
            id, user_id: userId, content, timestamp: now
        });

        res.status(201).json({
            id, userId, content, timestamp: now.toISOString()
        });
    } catch (error) {
        console.error('Create journal error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Delete entry
router.delete('/:id', requireAuth, async (req: Request, res) => {
    const { id } = req.params;
    const userId = req.session.userId;

    try {
        const result = await collections.journal().deleteOne({ id, user_id: userId });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Entry not found or unauthorized' });
        }

        res.json({ message: 'Entry deleted' });
    } catch (error) {
        console.error('Delete journal error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export const journalRoutes = router;
