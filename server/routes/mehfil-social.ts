import { Router, Request, Response } from "express";
import { collections } from "../db";
import { v4 as uuidv4 } from "uuid";
import { requireAuth } from "../middleware/auth";

export const mehfilSocialRouter = Router();

mehfilSocialRouter.use(requireAuth);

// ═══════════════════════════════════════════════════════════
// SAVED POSTS
// ═══════════════════════════════════════════════════════════

mehfilSocialRouter.get("/saved-posts", async (req: any, res: Response) => {
  try {
    const userId = req.session.userId;

    // Get saved thought IDs
    const saves = await collections.mehfilSaves()
      .find({ user_id: userId })
      .sort({ created_at: -1 })
      .toArray();

    const thoughtIds = saves.map(s => s.thought_id);

    if (thoughtIds.length === 0) {
      return res.json({ posts: [], reactedThoughtIds: [] });
    }

    // Get thoughts
    const thoughts = await collections.mehfilThoughts()
      .find({
        id: { $in: thoughtIds },
        $and: [
          { $or: [{ status: 'approved' }, { status: { $exists: false } }] },
          { $or: [{ expires_at: { $exists: false } }, { expires_at: null }, { expires_at: { $gt: new Date() } }] },
        ],
      })
      .toArray();
    const thoughtMap = new Map(thoughts.map(t => [t.id, t]));

    // Build posts in save order
    const posts = saves
      .map(s => {
        const t = thoughtMap.get(s.thought_id);
        if (!t) return null;
        return {
          id: t.id,
          userId: t.is_anonymous ? '' : t.user_id,
          isAnonymous: Boolean(t.is_anonymous),
          authorName: t.is_anonymous ? 'Anonymous User' : t.author_name,
          authorAvatar: t.is_anonymous ? null : t.author_avatar,
          content: t.content,
          imageUrl: t.image_url,
          relatableCount: t.relatable_count || 0,
          createdAt: t.created_at,
          category: t.category || 'ACADEMIC',
          aiTags: Array.isArray(t.ai_tags) ? t.ai_tags : [],
          aiScore: typeof t.ai_score === 'number' ? t.ai_score : null,
          savedAt: s.created_at,
        };
      })
      .filter(Boolean);

    // Get user's reactions
    const reactions = await collections.mehfilReactions()
      .find({ user_id: userId, thought_id: { $in: thoughtIds } })
      .toArray();
    const reactedThoughtIds = reactions.map(r => r.thought_id);

    res.json({ posts, reactedThoughtIds });
  } catch (error) {
    console.error("Error fetching saved posts:", error);
    res.status(500).json({ error: "Failed to fetch saved posts" });
  }
});

// ═══════════════════════════════════════════════════════════
// FRIENDS / CONNECTIONS
// ═══════════════════════════════════════════════════════════

mehfilSocialRouter.get("/friends", async (req: any, res: Response) => {
  try {
    const userId = req.session.userId;

    const friendships = await collections.mehfilFriendships()
      .find({
        $or: [{ user_id: userId }, { friend_id: userId }],
        status: { $ne: 'rejected' }
      })
      .sort({ created_at: -1 })
      .toArray();

    // Get friend user IDs
    const friendUserIds = friendships.map(f =>
      f.user_id === userId ? f.friend_id : f.user_id
    );

    const users = await collections.users()
      .find({ id: { $in: friendUserIds } })
      .project({ id: 1, name: 1, avatar: 1 })
      .toArray();
    const userMap = new Map(users.map(u => [u.id, u]));

    const friends = friendships.map(f => {
      const friendId = f.user_id === userId ? f.friend_id : f.user_id;
      const friendUser = userMap.get(friendId);
      const requestType = f.user_id === userId ? 'requested' : 'pending';

      return {
        id: f.id,
        name: friendUser?.name || 'Unknown',
        avatar: friendUser?.avatar || null,
        status: f.status === 'accepted' ? 'accepted' : requestType,
        created_at: f.created_at,
      };
    });

    // Sort: pending incoming first, then accepted, then others
    friends.sort((a, b) => {
      const order = (s: string) => s === 'pending' ? 0 : s === 'accepted' ? 1 : 2;
      return order(a.status) - order(b.status);
    });

    res.json(friends);
  } catch (error) {
    console.error("Error fetching friends:", error);
    res.status(500).json({ error: "Failed to fetch friends" });
  }
});

// Send friend request
mehfilSocialRouter.post("/friends/request", async (req: any, res: Response) => {
  try {
    const userId = req.session.userId;
    const { friendId } = req.body;

    if (!friendId) return res.status(400).json({ error: "Friend ID is required" });
    if (userId === friendId) return res.status(400).json({ error: "Cannot connect with yourself" });

    const existing = await collections.mehfilFriendships().findOne({
      $or: [
        { user_id: userId, friend_id: friendId },
        { user_id: friendId, friend_id: userId }
      ]
    });

    if (existing) {
      if (existing.status === 'accepted') return res.status(400).json({ error: "Already connected" });
      if (existing.status === 'pending') return res.status(400).json({ error: "Friend request already sent" });
    }

    const friendshipId = uuidv4();
    await collections.mehfilFriendships().insertOne({
      id: friendshipId,
      user_id: userId,
      friend_id: friendId,
      status: 'pending',
      created_at: new Date(),
      accepted_at: null,
    });

    res.status(201).json({ message: "Friend request sent", friendshipId });
  } catch (error) {
    console.error("Error sending friend request:", error);
    res.status(500).json({ error: "Failed to send friend request" });
  }
});

// Accept friend request
mehfilSocialRouter.post("/friends/:friendshipId/accept", async (req: any, res: Response) => {
  try {
    const userId = req.session.userId;
    const { friendshipId } = req.params;

    const result = await collections.mehfilFriendships().updateOne(
      { id: friendshipId, friend_id: userId, status: 'pending' },
      { $set: { status: 'accepted', accepted_at: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Friend request not found or already processed" });
    }

    res.json({ message: "Friend request accepted" });
  } catch (error) {
    console.error("Error accepting friend request:", error);
    res.status(500).json({ error: "Failed to accept friend request" });
  }
});

// Remove friend
mehfilSocialRouter.delete("/friends/:friendshipId", async (req: any, res: Response) => {
  try {
    const userId = req.session.userId;
    const { friendshipId } = req.params;

    const result = await collections.mehfilFriendships().deleteOne({
      id: friendshipId,
      $or: [{ user_id: userId }, { friend_id: userId }]
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Friendship not found" });
    }

    res.json({ message: "Connection removed" });
  } catch (error) {
    console.error("Error removing friend:", error);
    res.status(500).json({ error: "Failed to remove connection" });
  }
});

// Check friendship status
mehfilSocialRouter.get("/friends/status/:targetUserId", async (req: any, res: Response) => {
  try {
    const userId = req.session.userId;
    const { targetUserId } = req.params;

    if (userId === targetUserId) return res.json({ status: 'self' });

    const friendship = await collections.mehfilFriendships().findOne({
      $or: [
        { user_id: userId, friend_id: targetUserId },
        { user_id: targetUserId, friend_id: userId }
      ]
    });

    if (!friendship) return res.json({ status: 'none' });

    res.json({
      status: friendship.status,
      direction: friendship.user_id === userId ? 'sent' : 'received',
      friendshipId: friendship.id,
    });
  } catch (error) {
    console.error("Error checking friendship status:", error);
    res.status(500).json({ error: "Failed to check friendship status" });
  }
});

// ═══════════════════════════════════════════════════════════
// USER ANALYTICS
// ═══════════════════════════════════════════════════════════

mehfilSocialRouter.get("/analytics", async (req: any, res: Response) => {
  try {
    const userId = req.session.userId;

    const [
      totalThoughts,
      totalReactions,
      totalComments,
      totalSaves,
      totalShares,
      friendsCount,
      user
    ] = await Promise.all([
      collections.mehfilThoughts().countDocuments({ user_id: userId }),
      collections.mehfilReactions().countDocuments({ user_id: userId }),
      collections.mehfilComments().countDocuments({ user_id: userId }),
      collections.mehfilSaves().countDocuments({ user_id: userId }),
      collections.mehfilShares().countDocuments({ user_id: userId }),
      collections.mehfilFriendships().countDocuments({
        $or: [{ user_id: userId }, { friend_id: userId }],
        status: 'accepted'
      }),
      collections.users().findOne({ id: userId }, { projection: { created_at: 1 } }),
    ]);

    res.json({
      totalThoughts,
      totalReactions,
      totalComments,
      totalSaves,
      totalShares,
      friendsCount,
      joinedDate: user?.created_at || new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

export default mehfilSocialRouter;
