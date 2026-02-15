import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { collections } from '../db';

interface MehfilUser {
  id: string;
  name: string;
  avatar: string;
  socketId: string;
}

interface MehfilSocketOptions {
  paused?: boolean;
  pausedMessage?: string;
}

const connectedUsers = new Map<string, MehfilUser>();

export function setupMehfilSocket(httpServer: HttpServer, options?: MehfilSocketOptions) {
  const mehfilPaused = Boolean(options?.paused);
  const mehfilPausedMessage =
    options?.pausedMessage ||
    'Due to irrelevant and spam posts . Mehfil is currently not accessible . We are working on it and notify shortly';

  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/socket.io',
  });

  const mehfil = io.of('/mehfil');

  mehfil.on('connection', (socket: Socket) => {
    if (mehfilPaused) {
      socket.emit('error', { message: mehfilPausedMessage });
      socket.disconnect(true);
      return;
    }

    console.log('[MEHFIL] Client connected:', socket.id);

    socket.on('register', (user: { id: string; name: string; avatar: string }) => {
      if (!user?.id) return;
      connectedUsers.set(user.id, { ...user, socketId: socket.id });
      console.log(`[MEHFIL] User registered: ${user.name} (${user.id})`);
      mehfil.emit('onlineCount', connectedUsers.size);
    });

    socket.on('loadThoughts', async (data: { page?: number; limit?: number }) => {
      try {
        const page = data?.page || 1;
        const limit = data?.limit || 20;
        const skip = (page - 1) * limit;

        const thoughts = await collections.mehfilThoughts()
          .find({})
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(limit)
          .toArray();

        const userId = [...connectedUsers.entries()].find(([_, v]) => v.socketId === socket.id)?.[0];
        const thoughtIds = thoughts.map((t) => t.id);
        let userReactions: string[] = [];

        if (userId && thoughtIds.length > 0) {
          const reactions = await collections.mehfilReactions()
            .find({ user_id: userId, thought_id: { $in: thoughtIds } })
            .toArray();
          userReactions = reactions.map((r) => r.thought_id);
        }

        const formattedThoughts = thoughts.map((t) => ({
          isAnonymous: Boolean(t.is_anonymous),
          id: t.id,
          userId: t.is_anonymous ? '' : t.user_id,
          authorName: t.is_anonymous ? 'Anonymous User' : t.author_name,
          authorAvatar: t.is_anonymous ? null : t.author_avatar,
          content: t.content,
          imageUrl: t.image_url,
          relatableCount: t.relatable_count || 0,
          createdAt: t.created_at,
          hasReacted: userReactions.includes(t.id),
        }));

        socket.emit('thoughts', {
          thoughts: formattedThoughts,
          page,
          hasMore: thoughts.length === limit,
        });
      } catch (err) {
        console.error('[MEHFIL] Load thoughts error:', err);
        socket.emit('error', { message: 'Failed to load thoughts' });
      }
    });

    socket.on('newThought', async (data: { content: string; imageUrl?: string; isAnonymous?: boolean }) => {
      try {
        const user = [...connectedUsers.entries()].find(([_, v]) => v.socketId === socket.id);

        if (!user) {
          socket.emit('error', { message: 'Not registered' });
          return;
        }

        const [userId, userData] = user;
        const id = uuidv4();
        const now = new Date();
        const isAnonymous = Boolean(data.isAnonymous);

        await collections.mehfilThoughts().insertOne({
          id,
          user_id: userId,
          author_name: userData.name,
          author_avatar: userData.avatar,
          is_anonymous: isAnonymous,
          content: data.content,
          image_url: data.imageUrl || null,
          relatable_count: 0,
          created_at: now,
        });

        const thought = {
          isAnonymous,
          id,
          userId: isAnonymous ? '' : userId,
          authorName: isAnonymous ? 'Anonymous User' : userData.name,
          authorAvatar: isAnonymous ? null : userData.avatar,
          content: data.content,
          imageUrl: data.imageUrl || null,
          relatableCount: 0,
          createdAt: now,
          hasReacted: false,
        };

        mehfil.emit('thoughtCreated', thought);
      } catch (err) {
        console.error('[MEHFIL] New thought error:', err);
        socket.emit('error', { message: 'Failed to create thought' });
      }
    });

    socket.on('toggleReaction', async (data: { thoughtId: string }) => {
      try {
        const user = [...connectedUsers.entries()].find(([_, v]) => v.socketId === socket.id);

        if (!user) return;
        const [userId] = user;

        const existing = await collections.mehfilReactions().findOne({
          thought_id: data.thoughtId,
          user_id: userId,
        });

        if (existing) {
          await collections.mehfilReactions().deleteOne({
            thought_id: data.thoughtId,
            user_id: userId,
          });
          await collections.mehfilThoughts().updateOne(
            { id: data.thoughtId, relatable_count: { $gt: 0 } },
            { $inc: { relatable_count: -1 } },
          );
        } else {
          await collections.mehfilReactions().insertOne({
            id: uuidv4(),
            thought_id: data.thoughtId,
            user_id: userId,
            created_at: new Date(),
          });
          await collections.mehfilThoughts().updateOne(
            { id: data.thoughtId },
            { $inc: { relatable_count: 1 } },
          );
        }

        const thought = await collections.mehfilThoughts().findOne({ id: data.thoughtId });

        mehfil.emit('reactionUpdated', {
          thoughtId: data.thoughtId,
          relatableCount: thought?.relatable_count || 0,
          userId,
          hasReacted: !existing,
        });
      } catch (err) {
        console.error('[MEHFIL] Toggle reaction error:', err);
      }
    });

    socket.on('disconnect', () => {
      const user = [...connectedUsers.entries()].find(([_, v]) => v.socketId === socket.id);

      if (user) {
        connectedUsers.delete(user[0]);
        console.log(`[MEHFIL] User disconnected: ${user[1].name}`);
      }
      mehfil.emit('onlineCount', connectedUsers.size);
    });
  });

  return io;
}
