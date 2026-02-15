
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

// Helper to extract meta tags
const fetchUrlMetadata = async (url: string) => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const response = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SandeshBot/1.0)' }
        });
        clearTimeout(timeoutId);

        if (!response.ok) return null;

        const html = await response.text();

        const getMeta = (name: string) => {
            const match = html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'));
            return match ? match[1] : null;
        };

        const title = getMeta('og:title') || getMeta('twitter:title') || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
        const description = getMeta('og:description') || getMeta('twitter:description') || getMeta('description');
        const image = getMeta('og:image') || getMeta('twitter:image');

        if (!title && !description && !image) return null;

        return { title, description, image, url };
    } catch (error) {
        console.error('Error fetching URL metadata:', error);
        return null;
    }
};

// Preview Route
router.post('/preview', requireAuth, async (req: Request, res: Response) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ message: 'URL is required' });

        const metadata = await fetchUrlMetadata(url);
        res.json({ metadata });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch preview' });
    }
});

// Post new Sandesh (Admin only)
router.post('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const { content, importance = 'normal', link_meta, image_url } = req.body;
        const userId = (req as any).session.userId;

        // Check if user is admin
        const user = await collections.users().findOne({ id: userId });

        // Split and trim admin emails from env var
        const adminEmails = (process.env.ADMIN_EMAILS || 'steve123@example.com,safarparmar0@gmail.com')
            .split(',')
            .map(e => e.trim().toLowerCase())
            .filter(e => e.length > 0);

        if (!user || !user.email || !adminEmails.includes(user.email.toLowerCase())) {
            console.log(`[SANDESH] Unauthorized post attempt by ${user?.email}`);
            return res.status(403).json({ message: 'Unauthorized: Admin access required' });
        }

        if (!content && !image_url) {
            return res.status(400).json({ message: 'Content or Image is required' });
        }

        const newSandesh = {
            id: uuidv4(),
            content,
            importance, // 'normal' | 'high'
            link_meta, // { title, description, image, url }
            image_url,
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

// Update Sandesh (Admin only)
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { content, importance, link_meta, image_url } = req.body;
        const userId = (req as any).session.userId;

        // Check user
        const user = await collections.users().findOne({ id: userId });
        const adminEmails = (process.env.ADMIN_EMAILS || 'steve123@example.com,safarparmar0@gmail.com')
            .split(',')
            .map(e => e.trim().toLowerCase())
            .filter(e => e.length > 0);

        if (!user || !user.email || !adminEmails.includes(user.email.toLowerCase())) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const updateData: any = {
            updated_at: new Date()
        };

        if (content !== undefined) updateData.content = content;
        if (importance !== undefined) updateData.importance = importance;
        if (link_meta !== undefined) updateData.link_meta = link_meta;
        if (image_url !== undefined) updateData.image_url = image_url;

        const result = await collections.sandeshMessages().updateOne(
            { id: id },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Sandesh not found' });
        }

        res.json({ message: 'Sandesh updated successfully' });
    } catch (error) {
        console.error('Error updating sandesh:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Delete Sandesh (Admin only)
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).session.userId;

        // Check user
        const user = await collections.users().findOne({ id: userId });
        const adminEmails = (process.env.ADMIN_EMAILS || 'steve123@example.com,safarparmar0@gmail.com')
            .split(',')
            .map(e => e.trim().toLowerCase())
            .filter(e => e.length > 0);

        if (!user || !user.email || !adminEmails.includes(user.email.toLowerCase())) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const result = await collections.sandeshMessages().deleteOne({ id: id });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Sandesh not found' });
        }

        res.json({ message: 'Sandesh deleted successfully' });
    } catch (error) {
        console.error('Error deleting sandesh:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export const sandeshRoutes = router;
