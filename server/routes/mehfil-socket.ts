import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { collections } from '../db';

type MehfilCategory = 'ACADEMIC' | 'REFLECTIVE' | 'BULLSHIT';
type MehfilRoom = 'ACADEMIC' | 'REFLECTIVE';

interface MehfilUser {
  id: string;
  name: string;
  avatar: string;
  socketId: string;
  activeRoom: MehfilRoom;
}

interface MehfilSocketOptions {
  paused?: boolean;
  pausedMessage?: string;
}

interface ModerationResult {
  category: MehfilCategory;
  reasoning: string;
  isToxic: boolean;
  suggestedTags: string[];
  aiScore: number;
}

const connectedUsers = new Map<string, MehfilUser>();
const socketToUser = new Map<string, string>();

const DEFAULT_ROOM: MehfilRoom = 'ACADEMIC';
const ROOM_ORDER: MehfilRoom[] = ['ACADEMIC', 'REFLECTIVE'];
const MIN_THOUGHT_LENGTH = 15;
const BULLSHIT_TTL_HOURS = Number(process.env.MEHFIL_BULLSHIT_TTL_HOURS || 24);
const MAX_SPAM_STRIKES = Math.max(1, Number(process.env.MEHFIL_SPAM_STRIKE_LIMIT || 2));
const GROQ_API_KEY = String(process.env.GROQ_API_KEY || '').trim();
const GROQ_MODEL = process.env.MEHFIL_GROQ_MODEL || 'llama-3.1-8b-instant';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODERATION_EXEMPT_EMAILS = new Set(
  String(process.env.MEHFIL_MODERATION_BYPASS_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

const GROQ_SYSTEM_PROMPT = `You are the Content Architect for "Mehfil," a high-quality community for students.

Goal: Classify the user's input into one of three silos:
1. ACADEMIC: Study strategies, specific subjects, exam prep, or career guidance.
2. REFLECTIVE: Deep thoughts, sharing stress, mental health vents, or seeking support.
3. BULLSHIT: Low-effort noise, spam, abuse, or irrelevant gibberish.

Output Requirement: Respond ONLY with a JSON object:
{
  "category": "ACADEMIC" | "REFLECTIVE" | "BULLSHIT",
  "reasoning": "1-sentence explanation",
  "is_toxic": boolean,
  "suggested_tags": ["tag1", "tag2"]
}`;

function toRoomName(room: MehfilRoom): string {
  return `room:${room.toLowerCase()}`;
}

function normalizeRoom(room?: string | null): MehfilRoom {
  return room === 'REFLECTIVE' ? 'REFLECTIVE' : 'ACADEMIC';
}

function normalizeCategory(category?: string | null): MehfilCategory {
  if (category === 'ACADEMIC' || category === 'REFLECTIVE' || category === 'BULLSHIT') {
    return category;
  }
  return 'BULLSHIT';
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.max(0, Math.min(1, value));
}

function cleanModelJson(raw: string): string {
  return raw.trim().replace(/^```json\s*/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
}

function normalizeTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];

  const tags = input
    .map((tag) => String(tag || '').trim())
    .filter(Boolean)
    .map((tag) => tag.replace(/[^a-zA-Z0-9_#-]/g, '').slice(0, 24))
    .filter(Boolean)
    .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));

  return [...new Set(tags)].slice(0, 5);
}

function heuristicModeration(content: string, reason: string): ModerationResult {
  const normalized = content.toLowerCase();
  const words = normalized.split(/\s+/).filter(Boolean);

  const toxicRegex = /\b(hate|kill|stupid|idiot|abuse|harass|fuck|f\*+k)\b/i;
  if (toxicRegex.test(content)) {
    return {
      category: 'BULLSHIT',
      reasoning: reason || 'Detected toxic language that violates community quality standards.',
      isToxic: true,
      suggestedTags: ['#moderation'],
      aiScore: 0.1,
    };
  }

  if (content.length < MIN_THOUGHT_LENGTH || words.length < 3) {
    return {
      category: 'BULLSHIT',
      reasoning: reason || 'Too short or low-context to be useful for the community.',
      isToxic: false,
      suggestedTags: ['#loweffort'],
      aiScore: 0.15,
    };
  }

  const academicHints = ['study', 'exam', 'revision', 'assignment', 'career', 'subject', 'syllabus', 'interview', 'notes'];
  const reflectiveHints = ['stress', 'anxiety', 'overwhelmed', 'feeling', 'lonely', 'burnout', 'mental', 'support', 'afraid'];

  if (academicHints.some((hint) => normalized.includes(hint))) {
    return {
      category: 'ACADEMIC',
      reasoning: 'Content is focused on learning, exams, or educational progress.',
      isToxic: false,
      suggestedTags: ['#study', '#guidance'],
      aiScore: 0.78,
    };
  }

  if (reflectiveHints.some((hint) => normalized.includes(hint))) {
    return {
      category: 'REFLECTIVE',
      reasoning: 'Content is emotionally reflective and support-oriented.',
      isToxic: false,
      suggestedTags: ['#reflection', '#support'],
      aiScore: 0.74,
    };
  }

  return {
    category: 'REFLECTIVE',
    reasoning: 'Content appears genuine and reflective by default.',
    isToxic: false,
    suggestedTags: ['#community'],
    aiScore: 0.55,
  };
}

async function classifyThought(content: string): Promise<ModerationResult> {
  if (!GROQ_API_KEY) {
    return heuristicModeration(content, 'Groq API key missing; fallback moderation used.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: GROQ_SYSTEM_PROMPT },
          { role: 'user', content },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Groq API failed (${response.status}): ${errorBody}`);
    }

    const data: any = await response.json();
    const rawContent = data?.choices?.[0]?.message?.content;

    if (typeof rawContent !== 'string' || !rawContent.trim()) {
      throw new Error('Groq response missing classification payload');
    }

    const parsed = JSON.parse(cleanModelJson(rawContent));
    const category = normalizeCategory(parsed?.category);
    const reasoning = String(parsed?.reasoning || '').trim() || 'Model classified this post for room quality control.';
    const isToxic = Boolean(parsed?.is_toxic);
    const suggestedTags = normalizeTags(parsed?.suggested_tags);

    const fallbackScore = category === 'BULLSHIT' ? 0.2 : 0.88;
    const aiScore = clampScore(Number(parsed?.ai_score ?? fallbackScore));

    return { category, reasoning, isToxic, suggestedTags, aiScore };
  } catch (error) {
    console.error('[MEHFIL] Groq classification failed, using fallback:', error);
    return heuristicModeration(content, 'Fallback moderation used due to model/API failure.');
  } finally {
    clearTimeout(timeout);
  }
}

function buildThoughtQuery(room: MehfilRoom) {
  const categoryFilter =
    room === 'ACADEMIC'
      ? { $or: [{ category: 'ACADEMIC' }, { category: { $exists: false } }] }
      : { category: 'REFLECTIVE' };

  return {
    $and: [
      categoryFilter,
      { $or: [{ status: 'approved' }, { status: { $exists: false } }] },
      { $or: [{ expires_at: { $exists: false } }, { expires_at: null }, { expires_at: { $gt: new Date() } }] },
    ],
  };
}

async function applySpamStrike(userId: string): Promise<{ strikeCount: number; isShadowBanned: boolean }> {
  await collections.users().updateOne({ id: userId }, { $inc: { spam_strike_count: 1 } });
  const user = await collections.users().findOne(
    { id: userId },
    { projection: { spam_strike_count: 1, is_shadow_banned: 1 } },
  );

  const strikeCount = Number(user?.spam_strike_count || 0);
  const shouldShadowBan = strikeCount >= MAX_SPAM_STRIKES && !user?.is_shadow_banned;

  if (shouldShadowBan) {
    await collections.users().updateOne({ id: userId }, { $set: { is_shadow_banned: true } });
  }

  return {
    strikeCount,
    isShadowBanned: Boolean(user?.is_shadow_banned || shouldShadowBan),
  };
}

async function storeFlaggedThought(input: {
  userId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  imageUrl?: string | null;
  isAnonymous: boolean;
  moderation: ModerationResult;
}) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + BULLSHIT_TTL_HOURS * 60 * 60 * 1000);

  await collections.mehfilThoughts().insertOne({
    id: uuidv4(),
    user_id: input.userId,
    author_name: input.authorName,
    author_avatar: input.authorAvatar,
    is_anonymous: input.isAnonymous,
    content: input.content,
    image_url: input.imageUrl || null,
    relatable_count: 0,
    created_at: now,
    category: 'BULLSHIT',
    ai_tags: input.moderation.suggestedTags,
    ai_score: input.moderation.aiScore,
    status: 'flagged',
    moderation_reason: input.moderation.reasoning,
    is_toxic: input.moderation.isToxic,
    expires_at: expiresAt,
  });
}

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

      connectedUsers.set(user.id, {
        id: user.id,
        name: user.name || 'User',
        avatar: user.avatar || '',
        socketId: socket.id,
        activeRoom: DEFAULT_ROOM,
      });
      socketToUser.set(socket.id, user.id);
      socket.join(toRoomName(DEFAULT_ROOM));

      console.log(`[MEHFIL] User registered: ${user.name} (${user.id})`);
      mehfil.emit('onlineCount', connectedUsers.size);
    });

    socket.on('joinRoom', (data: { room?: string }) => {
      const room = normalizeRoom(data?.room);
      const userId = socketToUser.get(socket.id);

      ROOM_ORDER.forEach((roomId) => socket.leave(toRoomName(roomId)));
      socket.join(toRoomName(room));

      if (userId) {
        const existing = connectedUsers.get(userId);
        if (existing) {
          connectedUsers.set(userId, { ...existing, activeRoom: room, socketId: socket.id });
        }
      }

      socket.emit('roomJoined', { room });
    });

    socket.on('loadThoughts', async (data: { page?: number; limit?: number; room?: string }) => {
      try {
        const page = data?.page || 1;
        const limit = Math.min(data?.limit || 20, 50);
        const skip = (page - 1) * limit;
        const room = normalizeRoom(data?.room);

        const thoughts = await collections.mehfilThoughts()
          .find(buildThoughtQuery(room))
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(limit)
          .toArray();

        const userId = socketToUser.get(socket.id);
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
          category: normalizeCategory(t.category || 'ACADEMIC'),
          aiTags: Array.isArray(t.ai_tags) ? t.ai_tags : [],
          aiScore: typeof t.ai_score === 'number' ? t.ai_score : null,
        }));

        socket.emit('thoughts', {
          thoughts: formattedThoughts,
          room,
          page,
          hasMore: thoughts.length === limit,
        });
      } catch (err) {
        console.error('[MEHFIL] Load thoughts error:', err);
        socket.emit('error', { message: 'Failed to load thoughts' });
      }
    });

    socket.on('newThought', async (data: { content: string; imageUrl?: string; isAnonymous?: boolean; room?: string }) => {
      try {
        const userId = socketToUser.get(socket.id);
        if (!userId) {
          socket.emit('error', { message: 'Not registered' });
          return;
        }

        const userData = connectedUsers.get(userId);
        if (!userData) {
          socket.emit('error', { message: 'Not registered' });
          return;
        }

        const content = String(data?.content || '').trim();
        if (!content) {
          socket.emit('error', { message: 'Thought content is required' });
          return;
        }

        const userProfile = await collections.users().findOne(
          { id: userId },
          {
            projection: {
              id: 1,
              email: 1,
              name: 1,
              avatar: 1,
              is_shadow_banned: 1,
              spam_strike_count: 1,
              mehfil_moderation_exempt: 1,
            },
          },
        );

        const userEmail = String(userProfile?.email || '').toLowerCase();
        const isModerationExempt =
          Boolean(userProfile?.mehfil_moderation_exempt) ||
          MODERATION_EXEMPT_EMAILS.has(userEmail);

        if (userProfile?.is_shadow_banned && !isModerationExempt) {
          socket.emit('thoughtAccepted', { message: 'Thought shared successfully.' });
          return;
        }

        const isAnonymous = Boolean(data?.isAnonymous);
        const authorName = String(userProfile?.name || userData.name || 'User');
        const authorAvatar = String(userProfile?.avatar || userData.avatar || '');

        if (content.length < MIN_THOUGHT_LENGTH) {
          const moderation = heuristicModeration(
            content,
            `Thought must be at least ${MIN_THOUGHT_LENGTH} characters to maintain quality.`,
          );

          await storeFlaggedThought({
            userId,
            authorName,
            authorAvatar,
            content,
            imageUrl: data?.imageUrl || null,
            isAnonymous,
            moderation,
          });

          if (isModerationExempt) {
            socket.emit('thoughtRejected', {
              message: "Thought doesn't meet community guidelines.",
              strikesRemaining: null,
              moderationExempt: true,
            });
          } else {
            const strike = await applySpamStrike(userId);
            if (strike.isShadowBanned) {
              socket.emit('thoughtAccepted', { message: 'Thought shared successfully.' });
            } else {
              socket.emit('thoughtRejected', {
                message: "Thought doesn't meet community guidelines.",
                strikesRemaining: Math.max(0, MAX_SPAM_STRIKES - strike.strikeCount),
              });
            }
          }
          return;
        }

        const moderation = await classifyThought(content);
        const isBullshit = moderation.category === 'BULLSHIT' || moderation.isToxic;

        if (isBullshit) {
          await storeFlaggedThought({
            userId,
            authorName,
            authorAvatar,
            content,
            imageUrl: data?.imageUrl || null,
            isAnonymous,
            moderation: {
              ...moderation,
              category: 'BULLSHIT',
              aiScore: clampScore(moderation.aiScore),
            },
          });

          if (isModerationExempt) {
            socket.emit('thoughtRejected', {
              message: "Thought doesn't meet community guidelines.",
              strikesRemaining: null,
              moderationExempt: true,
            });
          } else {
            const strike = await applySpamStrike(userId);
            if (strike.isShadowBanned) {
              socket.emit('thoughtAccepted', { message: 'Thought shared successfully.' });
            } else {
              socket.emit('thoughtRejected', {
                message: "Thought doesn't meet community guidelines.",
                strikesRemaining: Math.max(0, MAX_SPAM_STRIKES - strike.strikeCount),
              });
            }
          }
          return;
        }

        const routeRoom: MehfilRoom = moderation.category === 'REFLECTIVE' ? 'REFLECTIVE' : 'ACADEMIC';
        const id = uuidv4();
        const now = new Date();

        await collections.mehfilThoughts().insertOne({
          id,
          user_id: userId,
          author_name: authorName,
          author_avatar: authorAvatar,
          is_anonymous: isAnonymous,
          content,
          image_url: data?.imageUrl || null,
          relatable_count: 0,
          created_at: now,
          category: routeRoom,
          ai_tags: moderation.suggestedTags,
          ai_score: clampScore(moderation.aiScore),
          status: 'approved',
          moderation_reason: moderation.reasoning,
          is_toxic: false,
          expires_at: null,
        });

        const thought = {
          isAnonymous,
          id,
          userId: isAnonymous ? '' : userId,
          authorName: isAnonymous ? 'Anonymous User' : authorName,
          authorAvatar: isAnonymous ? null : authorAvatar,
          content,
          imageUrl: data?.imageUrl || null,
          relatableCount: 0,
          createdAt: now,
          hasReacted: false,
          category: routeRoom,
          aiTags: moderation.suggestedTags,
          aiScore: clampScore(moderation.aiScore),
        };

        const requestedRoom = normalizeRoom(data?.room);
        if (requestedRoom !== routeRoom) {
          socket.emit('thoughtRerouted', {
            room: routeRoom,
            reason: moderation.reasoning,
          });
        }

        socket.emit('thoughtAccepted', {
          message: 'Thought shared successfully.',
          category: routeRoom,
        });
        mehfil.to(toRoomName(routeRoom)).emit('thoughtCreated', thought);
      } catch (err) {
        console.error('[MEHFIL] New thought error:', err);
        socket.emit('error', { message: 'Failed to create thought' });
      }
    });

    socket.on('toggleReaction', async (data: { thoughtId: string }) => {
      try {
        const userId = socketToUser.get(socket.id);
        if (!userId) return;

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
        const room = normalizeRoom(thought?.category || 'ACADEMIC');
        const payload = {
          thoughtId: data.thoughtId,
          relatableCount: thought?.relatable_count || 0,
          userId,
          hasReacted: !existing,
        };

        socket.emit('reactionUpdated', payload);
        socket.broadcast.to(toRoomName(room)).emit('reactionUpdated', payload);
      } catch (err) {
        console.error('[MEHFIL] Toggle reaction error:', err);
      }
    });

    socket.on('disconnect', () => {
      const userId = socketToUser.get(socket.id);
      if (userId) {
        const user = connectedUsers.get(userId);
        if (user?.socketId === socket.id) {
          connectedUsers.delete(userId);
          console.log(`[MEHFIL] User disconnected: ${user.name}`);
        }
        socketToUser.delete(socket.id);
      }
      mehfil.emit('onlineCount', connectedUsers.size);
    });
  });

  return io;
}
