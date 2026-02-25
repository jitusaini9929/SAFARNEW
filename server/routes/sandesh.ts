
import { Router, Request, Response } from 'express';
import { collections } from '../db';
import { requireAuth } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get Sandesh list (admin: all, users: latest 5)
router.get('/', async (req: Request, res: Response) => {
    try {
        let isAdmin = false;

        // Check if user is logged in and is admin (even for public GET route if we want to show admin controls)
        // Note: requireAuth isn't middleware here, so we check session manually if present
        if ((req as any).session && (req as any).session.userId) {
            const userId = (req as any).session.userId;
            const user = await collections.users().findOne({ id: userId });
            const adminEmails = (process.env.ADMIN_EMAILS || 'steve123@example.com,safarparmar0@gmail.com')
                .split(',')
                .map(e => e.trim().toLowerCase())
                .filter(e => e.length > 0);

            if (user && user.email && adminEmails.includes(user.email.toLowerCase())) {
                isAdmin = true;
            }
        }

        const sandeshQuery = collections.sandeshMessages()
            .find({})
            .sort({ created_at: -1 });
        if (!isAdmin) {
            sandeshQuery.limit(5);
        }
        const sandeshes = await sandeshQuery.toArray();

        // If no sandesh, return empty list
        if (!sandeshes || sandeshes.length === 0) {
            return res.json({ sandesh: null, sandeshes: [], isAdmin });
        }

        res.json({
            sandesh: sandeshes[0],
            sandeshes,
            isAdmin
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
        const { content, importance = 'normal', link_meta, image_url, audio_url } = req.body;
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

        if (!content && !image_url && !audio_url) {
            return res.status(400).json({ message: 'Content, Image, or Audio is required' });
        }

        const newSandesh = {
            id: uuidv4(),
            content,
            importance, // 'normal' | 'high'
            link_meta, // { title, description, image, url }
            image_url,
            audio_url, // New field for audio note
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
        const { content, importance, link_meta, image_url, audio_url } = req.body;
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
        if (audio_url !== undefined) updateData.audio_url = audio_url;

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

// ═══════════════════════════════════════════════════════════
// REACTIONS (Like/Unlike)
// ═══════════════════════════════════════════════════════════

// Toggle like on a sandesh
router.post('/:id/react', requireAuth, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).session.userId;

        const existing = await collections.sandeshReactions().findOne({
            sandesh_id: id, user_id: userId
        });

        if (existing) {
            await collections.sandeshReactions().deleteOne({ sandesh_id: id, user_id: userId });
            const count = await collections.sandeshReactions().countDocuments({ sandesh_id: id });
            res.json({ liked: false, count });
        } else {
            await collections.sandeshReactions().insertOne({
                id: uuidv4(),
                sandesh_id: id,
                user_id: userId,
                created_at: new Date()
            });
            const count = await collections.sandeshReactions().countDocuments({ sandesh_id: id });
            res.json({ liked: true, count });
        }
    } catch (error) {
        console.error('Error toggling reaction:', error);
        res.status(500).json({ message: 'Failed to toggle reaction' });
    }
});

// Get reaction info for a sandesh
router.get('/:id/reactions', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).session?.userId;

        const count = await collections.sandeshReactions().countDocuments({ sandesh_id: id });
        let userLiked = false;
        if (userId) {
            const existing = await collections.sandeshReactions().findOne({ sandesh_id: id, user_id: userId });
            userLiked = !!existing;
        }

        res.json({ count, userLiked });
    } catch (error) {
        console.error('Error fetching reactions:', error);
        res.status(500).json({ message: 'Failed to fetch reactions' });
    }
});

// ═══════════════════════════════════════════════════════════
// COMMENTS
// ═══════════════════════════════════════════════════════════

// Get comments for a sandesh
router.get('/:id/comments', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const comments = await collections.sandeshComments()
            .find({ sandesh_id: id })
            .sort({ created_at: 1 })
            .toArray();

        // Fetch user info for comment authors
        const userIds = [...new Set(comments.map(c => c.user_id))];
        let userMap = new Map<string, any>();
        if (userIds.length > 0) {
            const users = await collections.users()
                .find({ id: { $in: userIds } })
                .project({ id: 1, name: 1, avatar: 1 })
                .toArray();
            userMap = new Map(users.map(u => [u.id, u]));
        }

        const result = comments.map(c => {
            const user = userMap.get(c.user_id);
            return {
                id: c.id,
                sandeshId: c.sandesh_id,
                userId: c.user_id,
                authorName: user?.name || 'Anonymous',
                authorAvatar: user?.avatar || null,
                content: c.content,
                createdAt: c.created_at,
            };
        });

        res.json({ comments: result });
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ message: 'Failed to fetch comments' });
    }
});

// Post a comment on a sandesh
router.post('/:id/comments', requireAuth, async (req: Request, res: Response) => {
    try {
        const { id: sandeshId } = req.params;
        const userId = (req as any).session.userId;
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ message: 'Comment content is required' });
        }

        const commentId = uuidv4();
        const now = new Date();

        await collections.sandeshComments().insertOne({
            id: commentId,
            sandesh_id: sandeshId,
            user_id: userId,
            content: content.trim(),
            created_at: now,
        });

        // Get author info
        const user = await collections.users().findOne(
            { id: userId },
            { projection: { name: 1, avatar: 1 } }
        );

        res.status(201).json({
            comment: {
                id: commentId,
                sandeshId,
                userId,
                authorName: user?.name || 'Anonymous',
                authorAvatar: user?.avatar || null,
                content: content.trim(),
                createdAt: now,
            }
        });
    } catch (error) {
        console.error('Error posting comment:', error);
        res.status(500).json({ message: 'Failed to post comment' });
    }
});

export const sandeshRoutes = router;
