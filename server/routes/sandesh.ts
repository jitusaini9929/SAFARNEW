
import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { collections } from '../db';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { getRedisClient } from '../lib/redis.client';
import { redisRateLimit } from '../middleware/redis-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { validateBlockedWords } from '../utils/contentFilter';
import { verifyAccessToken } from '../lib/jwt.service';
import { isAccessTokenBlocked } from '../lib/token.store';

const router = Router();
const SANDESH_CACHE_TTL_MS = Number(process.env.SANDESH_CACHE_TTL_MS || 30000);

type SandeshCacheEntry = {
    expiresAt: number;
    payload: any;
};

const sandeshCache = new Map<string, SandeshCacheEntry>();

const adminEmails = new Set(
    (process.env.ADMIN_EMAILS || 'steve123@example.com,safarparmar0@gmail.com,thatkindchic@gmail.com')
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter((email) => email.length > 0),
);

async function isAdminUser(userId: string | null | undefined): Promise<boolean> {
    if (!userId) return false;
    const user = await collections.users().findOne(
        { id: userId },
        { projection: { email: 1 } },
    );
    const email = String(user?.email || '').trim().toLowerCase();
    return !!email && adminEmails.has(email);
}

async function getOptionalAuthContext(req: Request): Promise<{ userId: string | null; isAdmin: boolean }> {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return { userId: null, isAdmin: false };
    }

    try {
        const token = authHeader.slice(7);
        const payload = verifyAccessToken(token);

        if (await isAccessTokenBlocked(payload.jti)) {
            return { userId: null, isAdmin: false };
        }

        const userId = payload.sub;
        const isAdmin = await isAdminUser(userId);
        return { userId, isAdmin };
    } catch {
        return { userId: null, isAdmin: false };
    }
}

function getSandeshCache(cacheKey: string) {
    const entry = sandeshCache.get(cacheKey);
    if (!entry) return null;
    if (Date.now() >= entry.expiresAt) {
        sandeshCache.delete(cacheKey);
        return null;
    }
    return entry.payload;
}

function setSandeshCache(cacheKey: string, payload: any) {
    sandeshCache.set(cacheKey, {
        payload,
        expiresAt: Date.now() + Math.max(1000, SANDESH_CACHE_TTL_MS),
    });
}

async function getRedisCache(cacheKey: string) {
    const client = getRedisClient();
    if (!client) return null;
    try {
        const cached = await client.get(cacheKey);
        if (!cached) return null;
        return JSON.parse(cached);
    } catch (error) {
        return null;
    }
}

async function setRedisCache(cacheKey: string, payload: any) {
    const client = getRedisClient();
    if (!client) return;
    try {
        await client.set(cacheKey, JSON.stringify(payload), 'PX', SANDESH_CACHE_TTL_MS);
    } catch (error) {
        // Ignore cache write failures.
    }
}

async function clearRedisCache(prefix: string) {
    const client = getRedisClient();
    if (!client) return;
    let cursor = '0';
    do {
        const [nextCursor, keys] = await client.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', '100');
        if (keys.length > 0) {
            await client.del(keys);
        }
        cursor = nextCursor;
    } while (cursor !== '0');
}

async function invalidateSandeshCache() {
    sandeshCache.clear();
    await clearRedisCache('sandesh:list:');
}

const previewLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many preview requests, please try again later.' },
});

const sandeshListLimiter = redisRateLimit({
    windowMs: 60 * 1000,
    max: 120,
    keyPrefix: 'sandesh:list',
});

// Get Sandesh list (admin: all, users: latest 5)
router.get('/', sandeshListLimiter, async (req: Request, res: Response) => {
    try {
        const { userId, isAdmin } = await getOptionalAuthContext(req);

        const cacheKey = `sandesh:list:${userId ?? 'public'}`;
        const redisCached = await getRedisCache(cacheKey);
        if (redisCached) {
            setSandeshCache(cacheKey, redisCached);
            res.set('Cache-Control', `private, max-age=${Math.floor(SANDESH_CACHE_TTL_MS / 1000)}`);
            return res.json(redisCached);
        }

        const cached = getSandeshCache(cacheKey);
        if (cached) {
            res.set('Cache-Control', `private, max-age=${Math.floor(SANDESH_CACHE_TTL_MS / 1000)}`);
            return res.json(cached);
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
            const payload = { sandesh: null, sandeshes: [], isAdmin };
            setSandeshCache(cacheKey, payload);
            await setRedisCache(cacheKey, payload);
            res.set('Cache-Control', `private, max-age=${Math.floor(SANDESH_CACHE_TTL_MS / 1000)}`);
            return res.json(payload);
        }

        const sandeshIds = sandeshes.map((item) => item.id);
        const [reactionRows, commentRows, likedRows] = await Promise.all([
            collections.sandeshReactions()
                .aggregate([
                    { $match: { sandesh_id: { $in: sandeshIds } } },
                    { $group: { _id: '$sandesh_id', count: { $sum: 1 } } },
                ])
                .toArray(),
            collections.sandeshComments()
                .aggregate([
                    { $match: { sandesh_id: { $in: sandeshIds } } },
                    { $group: { _id: '$sandesh_id', count: { $sum: 1 } } },
                ])
                .toArray(),
            userId
                ? collections.sandeshReactions()
                    .find({ sandesh_id: { $in: sandeshIds }, user_id: userId })
                    .project({ _id: 0, sandesh_id: 1 })
                    .toArray()
                : Promise.resolve([]),
        ]);

        const reactionCountById = new Map(reactionRows.map((row: any) => [row._id, row.count]));
        const commentCountById = new Map(commentRows.map((row: any) => [row._id, row.count]));
        const likedSet = new Set((likedRows || []).map((row: any) => row.sandesh_id));

        const enrichedSandeshes = sandeshes.map((item: any) => ({
            ...item,
            reactionCount: reactionCountById.get(item.id) || 0,
            commentCount: commentCountById.get(item.id) || 0,
            userLiked: userId ? likedSet.has(item.id) : false,
        }));

        const payload = {
            sandesh: enrichedSandeshes[0],
            sandeshes: enrichedSandeshes,
            isAdmin,
        };
        setSandeshCache(cacheKey, payload);
        await setRedisCache(cacheKey, payload);
        res.set('Cache-Control', `private, max-age=${Math.floor(SANDESH_CACHE_TTL_MS / 1000)}`);
        res.json(payload);
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
router.post('/preview', requireAuth, previewLimiter, async (req: Request, res: Response) => {
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
router.post('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
        const { content, importance = 'normal', link_meta, image_url, audio_url } = req.body;
        const userId = req.user!.userId;

        if (!content && !image_url && !audio_url) {
            return res.status(400).json({ message: 'Content, Image, or Audio is required' });
        }

        if (content && validateBlockedWords(content).isBlocked) {
            return res.status(400).json({ message: 'Sandesh contains blocked language. Please remove abusive words and try again.' });
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
        await invalidateSandeshCache();

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
router.put('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { content, importance, link_meta, image_url, audio_url } = req.body;

        const updateData: any = {
            updated_at: new Date()
        };

        if (content !== undefined && validateBlockedWords(content).isBlocked) {
            return res.status(400).json({ message: 'Sandesh contains blocked language. Please remove abusive words and try again.' });
        }
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

        await invalidateSandeshCache();
        res.json({ message: 'Sandesh updated successfully' });
    } catch (error) {
        console.error('Error updating sandesh:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Delete Sandesh (Admin only)
router.delete('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const result = await collections.sandeshMessages().deleteOne({ id: id });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Sandesh not found' });
        }

        await invalidateSandeshCache();
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

// Get comments for a sandesh (paginated)
router.get('/:id/comments', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const page = Math.max(1, Math.floor(Number(req.query.page) || 1));
        const limit = Math.min(100, Math.max(1, Math.floor(Number(req.query.limit) || 30)));
        const skip = (page - 1) * limit;

        const comments = await collections.sandeshComments()
            .find({ sandesh_id: id })
            .sort({ created_at: 1 })
            .skip(skip)
            .limit(limit)
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

        res.json({ comments: result, page, hasMore: comments.length === limit });
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

        if (validateBlockedWords(content).isBlocked) {
            return res.status(400).json({ message: 'Comment contains blocked language. Please remove abusive words and try again.' });
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

// Delete a comment on a sandesh (own comments only)
router.delete('/:sandeshId/comments/:commentId', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).session.userId;
        const { commentId } = req.params;

        const comment = await collections.sandeshComments().findOne({ id: commentId });
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }
        if (comment.user_id !== userId) {
            return res.status(403).json({ message: 'Not authorised to delete this comment' });
        }

        await collections.sandeshComments().deleteOne({ id: commentId });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ message: 'Failed to delete comment' });
    }
});

export const sandeshRoutes = router;
