
import { Router, Request, Response } from 'express';
import { collections } from '../db';
import { requireAuth } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get latest Sandesh
router.get('/', async (_req: Request, res: Response) => {
    try {
        const sandesh = await collections.sandeshMessages()
            .find({})
            .sort({ created_at: -1 })
            .limit(1)
            .toArray();

        // If no sandesh, return null
        if (!sandesh || sandesh.length === 0) {
            return res.json({ sandesh: null });
        }

        res.json({
            sandesh: sandesh[0]
        });
    } catch (error) {
        console.error('Error fetching sandesh:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Post new Sandesh (Admin only)
router.post('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const { content, importance = 'normal' } = req.body;
        const userId = (req as any).session.userId;

        // Check if user is admin
        const user = await collections.users().findOne({ id: userId });

        // Split and trim admin emails from env var
        const adminEmails = (process.env.ADMIN_EMAILS || '')
            .split(',')
            .map(e => e.trim().toLowerCase())
            .filter(e => e.length > 0);

        if (!user || !user.email || !adminEmails.includes(user.email.toLowerCase())) {
            console.log(`[SANDESH] Unauthorized post attempt by ${user?.email}`);
            return res.status(403).json({ message: 'Unauthorized: Admin access required' });
        }

        if (!content) {
            return res.status(400).json({ message: 'Content is required' });
        }

        const newSandesh = {
            id: uuidv4(),
            content,
            importance, // 'normal' | 'high'
            author_id: userId,
            created_at: new Date()
        };

        await collections.sandeshMessages().insertOne(newSandesh);

        res.status(201).json({
            message: 'Sandesh posted successfully',
            sandesh: newSandesh
        });
    } catch (error) {
        console.error('Error posting sandesh:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export const sandeshRoutes = router;
