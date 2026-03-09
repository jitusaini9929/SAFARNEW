import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { collections } from '../db';
import type { RequestHandler } from 'express';
import { markDmUserOffline, markDmUserOnline } from './dm-presence';

type MehfilCategory = 'ACADEMIC' | 'REFLECTIVE' | 'BULLSHIT';
type MehfilRoom = 'ACADEMIC' | 'REFLECTIVE';
type MehfilFeedRoom = MehfilRoom | 'ALL';

interface MehfilUser {
  id: string;
  name: string;
  avatar: string;
  socketId: string;
  activeRoom: MehfilFeedRoom;
}

interface MehfilSocketOptions {
  paused?: boolean;
  pausedMessage?: string;
  redisClient?: RedisLikeClient | null;
  sessionMiddleware?: RequestHandler;
}

interface RedisLikeClient {
  isReady?: boolean;
  set: (key: string, value: string, options?: { EX?: number }) => Promise<unknown>;
  get: (key: string) => Promise<string | null>;
  del: (key: string) => Promise<unknown>;
  incr: (key: string) => Promise<number>;
  expire: (key: string, seconds: number) => Promise<unknown>;
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
const dmRequestTimeouts = new Map<string, NodeJS.Timeout>();
const dmRoomTimeouts = new Map<string, NodeJS.Timeout>();
const dmRequests = new Map<string, { fromUserId: string; toUserId: string; context: any; status: 'pending' }>();
const dmRooms = new Map<string, { user1: string; user2: string; createdAt: number; messageCount: number }>();

const DM_REQUEST_TTL_SECONDS = 60;
const DM_ROOM_TTL_SECONDS = 2 * 60 * 60;
const DM_SOCKET_TTL_SECONDS = 60 * 60;
const DM_REQUEST_RATE_LIMIT = 5;
const DM_REQUEST_RATE_WINDOW_SECONDS = 60;
const DM_MAX_MESSAGE_LENGTH = 1000;
const DM_MAX_HANDLE_LENGTH = 64;
const DM_MAX_CONTEXT_PREVIEW_LENGTH = 120;
const DM_ALLOWED_PLATFORMS = new Set(['linkedin', 'instagram', 'discord']);

const DEFAULT_ROOM: MehfilRoom = 'ACADEMIC';
const ROOM_ORDER: MehfilRoom[] = ['ACADEMIC', 'REFLECTIVE'];
const DEFAULT_THOUGHTS_PAGE_SIZE = 50;
const MAX_THOUGHTS_PAGE_SIZE = 100;
const MIN_THOUGHT_LENGTH = 1;
const MAX_THOUGHT_LENGTH = 5000;
const BULLSHIT_TTL_HOURS = Number(process.env.MEHFIL_BULLSHIT_TTL_HOURS || 24);
const MAX_SPAM_STRIKES = Math.max(1, Number(process.env.MEHFIL_SPAM_STRIKE_LIMIT || 5));
const STRIKE_DECAY_DAYS = Math.max(1, Number(process.env.MEHFIL_STRIKE_DECAY_DAYS || 30));
const DEFAULT_USER_POST_TTL_MINUTES = Math.max(0, Number(process.env.MEHFIL_DEFAULT_POST_TTL_MINUTES || 0));
const POSTING_BAN_MESSAGE = 'you have been banned from posting messages';
const GROQ_API_KEY = String(process.env.GROQ_API_KEY || '').trim();
const GROQ_MODEL = process.env.MEHFIL_GROQ_MODEL || 'llama-3.1-8b-instant';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODERATION_EXEMPT_EMAILS = new Set(
  String(process.env.MEHFIL_MODERATION_BYPASS_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

const GROQ_SYSTEM_PROMPT = `You are the Content Architect for "Mehfil," a support community for students.

Goal: Classify the user's input into one of three silos with a very lenient bias.
Context: Users are students dealing with study pressure, family issues, financial struggles, and career anxiety. They speak English, Hindi, and Hinglish (including slang and casual phrasing).

Categories:
1. ACADEMIC: Study strategies, specific subjects, exam prep, results, or career guidance.
2. REFLECTIVE: Deep thoughts, personal stories, venting about family/life/money, mental health, seeking support, or sharing struggles.
   - PRIORITY RULE: If a post contains BOTH academic context (teachers, subjects, exams) AND personal/emotional struggle (family pressure, money, breakup, depression), ALWAYS classify as **REFLECTIVE**.
   - HIGH-SIGNAL KEYWORDS: "suicide", "want to die", "parents pressure", "parents don't allow", "no support", "beat me", "breakup", "giving up".
   - ALLOW: Long rants, sad stories, mentions of suicidal thoughts (seeking support), family fights, financial helplessness.
   - THESE ARE NOT TOXIC. They are cries for help or support.
3. BULLSHIT: Only use for explicit spam, harassment, hate speech, threats, or sexual/NSFW content.
   - STRICTLY BLOCK: Explicit hate speech, sexual harassment/NSFW, threats of violence, coercion, or targeted abuse.
   - DO NOT MARK BULLSHIT for Hinglish slang, casual Hindi/English mix, criticism, strong language, sarcasm, or low-effort but harmless posts.
   - If unsure between BULLSHIT vs ACADEMIC/REFLECTIVE, choose ACADEMIC or REFLECTIVE.

Output Requirement: Respond ONLY with a JSON object:
{
  "category": "ACADEMIC" | "REFLECTIVE" | "BULLSHIT",
  "reasoning": "1-sentence explanation",
  "is_toxic": boolean, // TRUE only for explicit hate speech, sexual content, or threats. FALSE for emotional venting.
  "suggested_tags": ["tag1", "tag2"]
}`;

function toRoomName(room: MehfilRoom): string {
  return `room:${room.toLowerCase()}`;
}

function normalizeFeedRoom(room?: string | null): MehfilFeedRoom {
  if (room === 'ALL') return 'ALL';
  if (room === 'REFLECTIVE') return 'REFLECTIVE';
  return 'ACADEMIC';
}

function normalizeRoom(room?: string | null): MehfilRoom {
  return room === 'REFLECTIVE' ? 'REFLECTIVE' : 'ACADEMIC';
}

function joinSocketFeedRoom(socket: Socket, room: MehfilFeedRoom) {
  ROOM_ORDER.forEach((roomId) => socket.leave(toRoomName(roomId)));
  if (room === 'ALL') {
    ROOM_ORDER.forEach((roomId) => socket.join(toRoomName(roomId)));
    return;
  }
  socket.join(toRoomName(room));
}

function normalizeCategory(category?: string | null): MehfilCategory {
  const value = String(category || '').trim().toUpperCase();
  if (value === 'ACADEMIC' || value === 'ACADEMIC_HALL') return 'ACADEMIC';
  if (value === 'REFLECTIVE' || value === 'THOUGHTS' || value === 'THOUGHT') return 'REFLECTIVE';
  if (value === 'BULLSHIT') return 'BULLSHIT';
  return 'BULLSHIT';
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.max(0, Math.min(1, value));
}

function normalizePostTtlMinutes(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.max(1, Math.floor(parsed));
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

  const toxicRegex =
    /\b(kill yourself|kys|rape|raped|rapist|sexual assault|nudes?|porn|i will kill|i['’]m going to kill|die you|threaten|terrorist|lynch)\b/i;
  if (toxicRegex.test(content)) {
    return {
      category: 'BULLSHIT',
      reasoning: reason || 'Detected toxic language that violates community quality standards.',
      isToxic: true,
      suggestedTags: ['#moderation'],
      aiScore: 0.1,
    };
  }

  if (content.length < MIN_THOUGHT_LENGTH) {
    return {
      category: 'REFLECTIVE',
      reasoning: reason || 'Short post; allowed under lenient moderation.',
      isToxic: false,
      suggestedTags: [],
      aiScore: 0.5,
    };
  }

  const academicHints = [
    'study', 'exam', 'revision', 'assignment', 'career', 'subject', 'syllabus', 'interview', 'notes',
    'padhai', 'padhna', 'padh', 'padhaii', 'exam ki', 'mock', 'test', 'result', 'score', 'rank',
  ];
  const reflectiveHints = [
    'stress', 'anxiety', 'overwhelmed', 'feeling', 'lonely', 'burnout', 'mental', 'support', 'afraid',
    'tension', 'pressure', 'sad', 'low', 'dukhi', 'pareshan', 'gussa', 'thak', 'thaka', 'anxious',
    'mood', 'depressed', 'depression', 'breakup', 'family', 'ghar', 'parents', 'paise', 'financial',
  ];

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

function buildThoughtQuery(room: MehfilFeedRoom) {
  const categoryFilter =
    room === 'ALL'
      ? {
        $or: [
          { category: { $in: ['ACADEMIC', 'ACADEMIC_HALL', 'REFLECTIVE', 'THOUGHTS', 'THOUGHT'] } },
          { category: { $exists: false } },
        ],
      }
      : room === 'ACADEMIC'
        ? { $or: [{ category: { $in: ['ACADEMIC', 'ACADEMIC_HALL'] } }, { category: { $exists: false } }] }
        : { category: { $in: ['REFLECTIVE', 'THOUGHTS', 'THOUGHT'] } };

  return {
    $and: [
      categoryFilter,
      { $or: [{ status: 'approved' }, { status: { $exists: false } }] },
      { $or: [{ expires_at: { $exists: false } }, { expires_at: null }, { expires_at: { $gt: new Date() } }] },
    ],
  };
}

async function applySpamStrike(userId: string): Promise<{ strikeCount: number; isShadowBanned: boolean }> {
  // Strike decay: if last strike was older than STRIKE_DECAY_DAYS, reset count before incrementing
  const decayCutoff = new Date(Date.now() - STRIKE_DECAY_DAYS * 24 * 60 * 60 * 1000);
  const existing = await collections.users().findOne(
    { id: userId },
    { projection: { spam_strike_count: 1, is_shadow_banned: 1, last_spam_strike_at: 1 } },
  );

  const lastStrikeAt = existing?.last_spam_strike_at ? new Date(existing.last_spam_strike_at) : null;
  const shouldReset = lastStrikeAt && lastStrikeAt.getTime() < decayCutoff.getTime();

  if (shouldReset) {
    // Strikes have decayed — reset to 1 (this new strike)
    await collections.users().updateOne(
      { id: userId },
      { $set: { spam_strike_count: 1, last_spam_strike_at: new Date() } },
    );
  } else {
    await collections.users().updateOne(
      { id: userId },
      { $inc: { spam_strike_count: 1 }, $set: { last_spam_strike_at: new Date() } },
    );
  }

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
  customExpiresAt?: Date | null;
}) {
  const now = new Date();
  const expiresAt = input.customExpiresAt || new Date(now.getTime() + BULLSHIT_TTL_HOURS * 60 * 60 * 1000);

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

function getActivePostingBan(user: any) {
  const reason = user?.mehfil_banned_reason ? String(user.mehfil_banned_reason) : null;
  if (user?.mehfil_banned_forever) {
    return {
      isActive: true,
      isPermanent: true,
      bannedUntil: null as Date | null,
      message: POSTING_BAN_MESSAGE,
      reason,
    };
  }

  const bannedUntil = user?.mehfil_banned_until ? new Date(user.mehfil_banned_until) : null;
  if (bannedUntil && bannedUntil.getTime() > Date.now()) {
    return {
      isActive: true,
      isPermanent: false,
      bannedUntil,
      message: POSTING_BAN_MESSAGE,
      reason,
    };
  }

  return {
    isActive: false,
    isPermanent: false,
    bannedUntil: null as Date | null,
    message: POSTING_BAN_MESSAGE,
    reason: null,
  };
}

function toBanPayload(ban: { isActive: boolean; isPermanent: boolean; bannedUntil: Date | null; message: string; reason?: string | null }) {
  return {
    isActive: ban.isActive,
    isPermanent: ban.isPermanent,
    bannedUntil: ban.bannedUntil ? ban.bannedUntil.toISOString() : null,
    message: ban.message,
    reason: ban.reason ?? null,
  };
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

function sanitizeText(input: unknown, maxLength: number): string {
  return stripHtml(String(input ?? '')).replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function normalizeDmPlatform(platform: unknown): 'linkedin' | 'instagram' | 'discord' | null {
  const normalized = String(platform ?? '').trim().toLowerCase();
  if (!DM_ALLOWED_PLATFORMS.has(normalized)) return null;
  return normalized as 'linkedin' | 'instagram' | 'discord';
}

function clearDmRequestTimer(requestId: string) {
  const existing = dmRequestTimeouts.get(requestId);
  if (existing) {
    clearTimeout(existing);
    dmRequestTimeouts.delete(requestId);
  }
}

function clearDmRoomTimer(roomId: string) {
  const existing = dmRoomTimeouts.get(roomId);
  if (existing) {
    clearTimeout(existing);
    dmRoomTimeouts.delete(roomId);
  }
}

function scheduleDmRequestExpiry(requestId: string) {
  clearDmRequestTimer(requestId);
  const timer = setTimeout(() => {
    dmRequests.delete(requestId);
    dmRequestTimeouts.delete(requestId);
  }, DM_REQUEST_TTL_SECONDS * 1000);
  dmRequestTimeouts.set(requestId, timer);
}

function scheduleDmRoomExpiry(roomId: string) {
  clearDmRoomTimer(roomId);
  const timer = setTimeout(() => {
    dmRooms.delete(roomId);
    dmRoomTimeouts.delete(roomId);
  }, DM_ROOM_TTL_SECONDS * 1000);
  dmRoomTimeouts.set(roomId, timer);
}

async function emitPendingDmRequestsToUser(
  mehfil: ReturnType<Server['of']>,
  socketId: string,
  userId: string,
) {
  if (!socketId || !userId) return;

  for (const [requestId, request] of dmRequests.entries()) {
    if (request.toUserId !== userId || request.status !== 'pending') continue;

    mehfil.to(socketId).emit('dm:incoming_request', {
      requestId,
      fromUserId: request.fromUserId,
      fromUserName: connectedUsers.get(request.fromUserId)?.name || 'User',
      context: request.context,
    });
  }
}

async function redisSetJSON(
  redisClient: RedisLikeClient | null | undefined,
  key: string,
  value: unknown,
  ttlSeconds: number,
) {
  if (!redisClient || !redisClient.isReady) return false;
  await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
  return true;
}

async function redisGetJSON<T>(
  redisClient: RedisLikeClient | null | undefined,
  key: string,
): Promise<T | null> {
  if (!redisClient || !redisClient.isReady) return null;
  const raw = await redisClient.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function redisDelKey(redisClient: RedisLikeClient | null | undefined, key: string) {
  if (!redisClient || !redisClient.isReady) return;
  await redisClient.del(key);
}

let mehfilNamespace: ReturnType<Server['of']> | null = null;

export function getMehfilNamespace() {
  return mehfilNamespace;
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
  mehfilNamespace = mehfil;
  const redisClient = options?.redisClient ?? null;

  if (options?.sessionMiddleware) {
    mehfil.use((socket, next) => {
      options.sessionMiddleware?.(socket.request as any, {} as any, next as any);
    });
  }

  mehfil.on('connection', (socket: Socket) => {
    if (mehfilPaused) {
      socket.emit('error', { message: mehfilPausedMessage });
      socket.disconnect(true);
      return;
    }

    console.log('[MEHFIL] Client connected:', socket.id);
    const sessionUserId = String((socket.request as any)?.session?.userId || '').trim();
    const effectiveUserId = sessionUserId || socketToUser.get(socket.id) || '';

    if (effectiveUserId) {
      socketToUser.set(socket.id, effectiveUserId);
      markDmUserOnline(effectiveUserId);
      redisSetJSON(redisClient, `dm:socket:${effectiveUserId}`, { socketId: socket.id }, DM_SOCKET_TTL_SECONDS).catch(() => {
        // best effort
      });
    }

    const getSocketUserId = () => {
      const bySession = String((socket.request as any)?.session?.userId || '').trim();
      if (bySession) return bySession;
      return socketToUser.get(socket.id) || '';
    };

    const getDisplayName = (userId: string) => {
      const connected = connectedUsers.get(userId);
      return connected?.name || 'User';
    };

    const getActiveSocketIdForUser = async (userId: string): Promise<string | null> => {
      const connected = connectedUsers.get(userId);
      if (connected?.socketId) return connected.socketId;

      const redisSocket = await redisGetJSON<{ socketId?: string }>(redisClient, `dm:socket:${userId}`);
      return redisSocket?.socketId || null;
    };

    socket.on('register', async (user: { id: string; name: string; avatar: string }) => {
      const userId = getSocketUserId() || String(user?.id || '').trim();
      if (!userId) return;

      connectedUsers.set(userId, {
        id: userId,
        name: user.name || 'User',
        avatar: user.avatar || '',
        socketId: socket.id,
        activeRoom: DEFAULT_ROOM,
      });
      socketToUser.set(socket.id, userId);
      markDmUserOnline(userId);
      redisSetJSON(redisClient, `dm:socket:${userId}`, { socketId: socket.id }, DM_SOCKET_TTL_SECONDS).catch(() => {
        // best effort
      });
      socket.join(toRoomName(DEFAULT_ROOM));
      socket.join(`user:${userId}`);
      await emitPendingDmRequestsToUser(mehfil, socket.id, userId);

      console.log(`[MEHFIL] User registered: ${user.name} (${userId})`);
      mehfil.emit('onlineCount', connectedUsers.size);

      try {
        const userProfile = await collections.users().findOne(
          { id: userId },
          {
            projection: {
              mehfil_banned_until: 1,
              mehfil_banned_forever: 1,
              mehfil_banned_reason: 1,
              is_shadow_banned: 1,
              spam_strike_count: 1,
            },
          },
        );

        const activeBan = getActivePostingBan(userProfile);
        if (activeBan.isActive) {
          socket.emit('postingBanStatus', toBanPayload(activeBan));
        }
        if (userProfile?.is_shadow_banned) {
          socket.emit('shadowBanNotice', {
            message: 'Your posts are currently hidden from other users.',
            reason: userProfile?.mehfil_banned_reason || 'Repeated policy violations or spam reports.',
            strikeCount: Number(userProfile?.spam_strike_count || 0),
          });
        }
      } catch (error) {
        console.error('[MEHFIL] Failed to fetch posting ban status on register:', error);
      }
    });

    socket.on('checkPostingBan', async () => {
      try {
        const userId = socketToUser.get(socket.id);
        if (!userId) return;

        const userProfile = await collections.users().findOne(
          { id: userId },
          {
            projection: {
              mehfil_banned_until: 1,
              mehfil_banned_forever: 1,
              mehfil_banned_reason: 1,
              is_shadow_banned: 1,
              spam_strike_count: 1,
            },
          },
        );

        const activeBan = getActivePostingBan(userProfile);
        socket.emit('postingBanStatus', toBanPayload(activeBan));
        if (userProfile?.is_shadow_banned) {
          socket.emit('shadowBanNotice', {
            message: 'Your posts are currently hidden from other users.',
            reason: userProfile?.mehfil_banned_reason || 'Repeated policy violations or spam reports.',
            strikeCount: Number(userProfile?.spam_strike_count || 0),
          });
        }
      } catch (error) {
        console.error('[MEHFIL] Failed to check posting ban:', error);
      }
    });

    socket.on('dm:request', async (payload: { toUserId?: string; context?: { type?: string; id?: string; preview?: string } }) => {
      try {
        const fromUserId = getSocketUserId();
        const toUserId = String(payload?.toUserId || '').trim();
        if (!fromUserId || !toUserId || fromUserId === toUserId) {
          socket.emit('dm:error', { message: 'Invalid user for request' });
          return;
        }

        const rateKey = `dm:ratelimit:${fromUserId}`;
        let currentCount = 0;
        if (redisClient?.isReady) {
          currentCount = await redisClient.incr(rateKey);
          if (currentCount === 1) await redisClient.expire(rateKey, DM_REQUEST_RATE_WINDOW_SECONDS);
        } else {
          currentCount = Number((socket.data.dmRequestCount || 0)) + 1;
          socket.data.dmRequestCount = currentCount;
          if (!socket.data.dmRequestResetTimer) {
            socket.data.dmRequestResetTimer = setTimeout(() => {
              socket.data.dmRequestCount = 0;
              socket.data.dmRequestResetTimer = null;
            }, DM_REQUEST_RATE_WINDOW_SECONDS * 1000);
          }
        }

        if (currentCount > DM_REQUEST_RATE_LIMIT) {
          socket.emit('dm:error', { message: 'Too many connect requests. Please wait a moment.' });
          return;
        }

        const context = {
          type: payload?.context?.type === 'comment' ? 'comment' : 'post',
          id: sanitizeText(payload?.context?.id, 128),
          preview: sanitizeText(payload?.context?.preview, DM_MAX_CONTEXT_PREVIEW_LENGTH),
        };

        const requestId = uuidv4();
        const requestPayload = { fromUserId, toUserId, context, status: 'pending' as const };

        await redisSetJSON(redisClient, `dm:request:${requestId}`, requestPayload, DM_REQUEST_TTL_SECONDS);
        dmRequests.set(requestId, requestPayload);
        scheduleDmRequestExpiry(requestId);

        const recipientSocketId = await getActiveSocketIdForUser(toUserId);

        if (!recipientSocketId) {
          socket.emit('dm:request_sent', { requestId, toUserId, queued: true });
          return;
        }

        mehfil.to(`user:${toUserId}`).emit('dm:incoming_request', {
          requestId,
          fromUserId,
          fromUserName: getDisplayName(fromUserId),
          context,
        });

        socket.emit('dm:request_sent', { requestId, toUserId });
      } catch (error) {
        console.error('[MEHFIL][DM] request failed:', error);
        socket.emit('dm:error', { message: 'Unable to send request' });
      }
    });

    socket.on('dm:sync_pending', async () => {
      try {
        const userId = getSocketUserId();
        if (!userId) return;
        await emitPendingDmRequestsToUser(mehfil, socket.id, userId);
      } catch (error) {
        console.error('[MEHFIL][DM] sync pending failed:', error);
      }
    });

    socket.on('dm:accept', async ({ requestId }: { requestId?: string }) => {
      try {
        const acceptedByUserId = getSocketUserId();
        const normalizedRequestId = String(requestId || '').trim();
        if (!acceptedByUserId || !normalizedRequestId) return;

        const redisRequest = await redisGetJSON<{ fromUserId: string; toUserId: string; context: any; status: 'pending' }>(
          redisClient,
          `dm:request:${normalizedRequestId}`,
        );
        const request = redisRequest || dmRequests.get(normalizedRequestId);
        if (!request) {
          socket.emit('dm:error', { message: 'Request expired' });
          return;
        }
        if (request.toUserId !== acceptedByUserId) {
          socket.emit('dm:error', { message: 'Unauthorized request action' });
          return;
        }

        const roomId = uuidv4();
        const roomPayload = {
          user1: request.fromUserId,
          user2: acceptedByUserId,
          createdAt: Date.now(),
          messageCount: 0,
        };

        await redisSetJSON(redisClient, `dm:room:${roomId}`, roomPayload, DM_ROOM_TTL_SECONDS);
        dmRooms.set(roomId, roomPayload);
        scheduleDmRoomExpiry(roomId);

        socket.join(roomId);
        const senderSocketId = await getActiveSocketIdForUser(request.fromUserId);
        if (senderSocketId) {
          mehfil.in(senderSocketId).socketsJoin(roomId);
          mehfil.to(senderSocketId).emit('dm:accepted', {
            roomId,
            otherUserId: acceptedByUserId,
            otherUserName: getDisplayName(acceptedByUserId),
          });
        }

        socket.emit('dm:opened', {
          roomId,
          otherUserId: request.fromUserId,
          otherUserName: getDisplayName(request.fromUserId),
        });

        await redisDelKey(redisClient, `dm:request:${normalizedRequestId}`);
        dmRequests.delete(normalizedRequestId);
        clearDmRequestTimer(normalizedRequestId);
      } catch (error) {
        console.error('[MEHFIL][DM] accept failed:', error);
        socket.emit('dm:error', { message: 'Unable to accept request' });
      }
    });

    socket.on('dm:decline', async ({ requestId }: { requestId?: string }) => {
      try {
        const declinedByUserId = getSocketUserId();
        const normalizedRequestId = String(requestId || '').trim();
        if (!declinedByUserId || !normalizedRequestId) return;

        const request =
          (await redisGetJSON<{ fromUserId: string; toUserId: string }>(redisClient, `dm:request:${normalizedRequestId}`)) ||
          dmRequests.get(normalizedRequestId);
        if (!request) return;
        if (request.toUserId !== declinedByUserId) return;

        const senderSocketId = await getActiveSocketIdForUser(request.fromUserId);
        if (senderSocketId) {
          mehfil.to(senderSocketId).emit('dm:declined', { requestId: normalizedRequestId });
        }

        await redisDelKey(redisClient, `dm:request:${normalizedRequestId}`);
        dmRequests.delete(normalizedRequestId);
        clearDmRequestTimer(normalizedRequestId);
      } catch (error) {
        console.error('[MEHFIL][DM] decline failed:', error);
      }
    });

    socket.on('dm:message', async ({ roomId, text }: { roomId?: string; text?: string }) => {
      try {
        const senderUserId = getSocketUserId();
        const normalizedRoomId = String(roomId || '').trim();
        const message = sanitizeText(text, DM_MAX_MESSAGE_LENGTH);
        if (!senderUserId || !normalizedRoomId || !message) return;

        const room =
          (await redisGetJSON<{ user1: string; user2: string; createdAt: number; messageCount: number }>(
            redisClient,
            `dm:room:${normalizedRoomId}`,
          )) || dmRooms.get(normalizedRoomId);
        if (!room) {
          socket.emit('dm:error', { message: 'Room is no longer active' });
          return;
        }
        if (room.user1 !== senderUserId && room.user2 !== senderUserId) {
          socket.emit('dm:error', { message: 'Unauthorized room access' });
          return;
        }

        const nextRoom = { ...room, messageCount: Number(room.messageCount || 0) + 1 };
        dmRooms.set(normalizedRoomId, nextRoom);
        await redisSetJSON(redisClient, `dm:room:${normalizedRoomId}`, nextRoom, DM_ROOM_TTL_SECONDS);
        scheduleDmRoomExpiry(normalizedRoomId);

        mehfil.to(normalizedRoomId).emit('dm:message', {
          roomId: normalizedRoomId,
          fromUserId: senderUserId,
          fromUserName: getDisplayName(senderUserId),
          text: message,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error('[MEHFIL][DM] message failed:', error);
      }
    });

    socket.on('dm:share_handle', async ({ roomId, platform, handle }: { roomId?: string; platform?: string; handle?: string }) => {
      try {
        const senderUserId = getSocketUserId();
        const normalizedRoomId = String(roomId || '').trim();
        const normalizedPlatform = normalizeDmPlatform(platform);
        const normalizedHandle = sanitizeText(handle, DM_MAX_HANDLE_LENGTH).replace(/^@+/, '');
        if (!senderUserId || !normalizedRoomId || !normalizedPlatform || !normalizedHandle) return;

        const room =
          (await redisGetJSON<{ user1: string; user2: string; createdAt: number; messageCount: number }>(
            redisClient,
            `dm:room:${normalizedRoomId}`,
          )) || dmRooms.get(normalizedRoomId);
        if (!room) return;
        if (room.user1 !== senderUserId && room.user2 !== senderUserId) return;

        mehfil.to(normalizedRoomId).emit('dm:handle_received', {
          roomId: normalizedRoomId,
          fromUserId: senderUserId,
          fromUserName: getDisplayName(senderUserId),
          platform: normalizedPlatform,
          handle: normalizedHandle,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error('[MEHFIL][DM] share handle failed:', error);
      }
    });

    socket.on('dm:leave_room', async ({ roomId }: { roomId?: string }) => {
      try {
        const userId = getSocketUserId();
        const normalizedRoomId = String(roomId || '').trim();
        if (!userId || !normalizedRoomId) return;

        const room =
          (await redisGetJSON<{ user1: string; user2: string; createdAt: number; messageCount: number }>(
            redisClient,
            `dm:room:${normalizedRoomId}`,
          )) || dmRooms.get(normalizedRoomId);
        if (!room) return;
        if (room.user1 !== userId && room.user2 !== userId) return;

        const otherUserId = room.user1 === userId ? room.user2 : room.user1;
        const otherSocketId = await getActiveSocketIdForUser(otherUserId);
        if (otherSocketId) {
          mehfil.to(otherSocketId).emit('dm:user_left', { roomId: normalizedRoomId, userId });
          const otherSocket = mehfil.sockets.get(otherSocketId);
          otherSocket?.leave(normalizedRoomId);
        }

        socket.leave(normalizedRoomId);
        await redisDelKey(redisClient, `dm:room:${normalizedRoomId}`);
        dmRooms.delete(normalizedRoomId);
        clearDmRoomTimer(normalizedRoomId);
      } catch (error) {
        console.error('[MEHFIL][DM] leave room failed:', error);
      }
    });

    socket.on('joinRoom', (data: { room?: string }) => {
      const room = normalizeFeedRoom(data?.room);
      const userId = socketToUser.get(socket.id);

      joinSocketFeedRoom(socket, room);

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
        const requestedPage = Number(data?.page ?? 1);
        const page = Number.isFinite(requestedPage) ? Math.max(1, Math.floor(requestedPage)) : 1;
        const requestedLimit = Number(data?.limit ?? DEFAULT_THOUGHTS_PAGE_SIZE);
        const normalizedLimit = Number.isFinite(requestedLimit)
          ? Math.max(1, Math.floor(requestedLimit))
          : DEFAULT_THOUGHTS_PAGE_SIZE;
        const limit = Math.min(normalizedLimit, MAX_THOUGHTS_PAGE_SIZE);
        const skip = (page - 1) * limit;
        const room = normalizeFeedRoom(data?.room);

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
          commentsCount: t.comments_count || 0,
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

        let userProfile = await collections.users().findOne(
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
              mehfil_post_ttl_minutes: 1,
              mehfil_banned_until: 1,
              mehfil_banned_forever: 1,
              mehfil_banned_reason: 1,
            },
          },
        );

        const activeBan = getActivePostingBan(userProfile);
        if (activeBan.isActive) {
          socket.emit('postingBanStatus', toBanPayload(activeBan));
          socket.emit('thoughtRejected', {
            message: POSTING_BAN_MESSAGE,
            ban: toBanPayload(activeBan),
          });
          return;
        }

        if (userProfile?.mehfil_banned_until && new Date(userProfile.mehfil_banned_until).getTime() <= Date.now()) {
          await collections.users().updateOne(
            { id: userId },
            {
              $set: { mehfil_banned_until: null, is_shadow_banned: false, spam_strike_count: 0 },
              $unset: { mehfil_banned_reason: "", mehfil_banned_at: "", last_spam_strike_at: "" },
            },
          );
          // Refresh userProfile after clearing bans so shadow check below uses latest state
          userProfile = await collections.users().findOne(
            { id: userId },
            {
              projection: {
                id: 1, email: 1, name: 1, avatar: 1,
                is_shadow_banned: 1, spam_strike_count: 1,
                mehfil_moderation_exempt: 1, mehfil_post_ttl_minutes: 1,
                mehfil_banned_until: 1, mehfil_banned_forever: 1, mehfil_banned_reason: 1,
              },
            },
          );
        }

        const userEmail = String(userProfile?.email || '').toLowerCase();
        const isModerationExempt =
          Boolean(userProfile?.mehfil_moderation_exempt) ||
          MODERATION_EXEMPT_EMAILS.has(userEmail);
        const userPostTtlMinutes =
          normalizePostTtlMinutes(userProfile?.mehfil_post_ttl_minutes) || DEFAULT_USER_POST_TTL_MINUTES;
        const customExpiryForUser =
          userPostTtlMinutes > 0 ? new Date(Date.now() + userPostTtlMinutes * 60 * 1000) : null;

        // Shared variables for thought construction
        const isAnonymous = Boolean(data?.isAnonymous);
        const authorName = String(userProfile?.name || userData.name || 'User');
        const authorAvatar = String(userProfile?.avatar || userData.avatar || '');
        const requestedRoom = normalizeRoom(data?.room);

        // Helper to emit a fake thought to the shadow-banned user only
        const emitShadowThought = () => {
          const now = new Date();
          const shadowThought = {
            isAnonymous,
            id: uuidv4(),
            userId: isAnonymous ? '' : userId,
            authorName: isAnonymous ? 'Anonymous User' : authorName,
            authorAvatar: isAnonymous ? null : authorAvatar,
            content,
            imageUrl: data?.imageUrl || null,
            relatableCount: 0,
            commentsCount: 0,
            createdAt: now,
            hasReacted: false,
            category: requestedRoom, // Show it in the room they asked for
            aiTags: [],
            aiScore: 0.5,
          };

          socket.emit('thoughtAccepted', {
            message: 'Thought shared successfully.',
            category: requestedRoom,
          });
          socket.emit('thoughtCreated', shadowThought);
        };

        if (userProfile?.is_shadow_banned && !isModerationExempt) {
          socket.emit('shadowBanNotice', {
            message: 'Your posts are currently hidden from other users.',
            reason: userProfile?.mehfil_banned_reason || 'Repeated policy violations or spam reports.',
            strikeCount: Number(userProfile?.spam_strike_count || 0),
          });
          emitShadowThought();
          return;
        }

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
            customExpiresAt: customExpiryForUser,
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
              socket.emit('shadowBanNotice', {
                message: 'Your posts are currently hidden from other users.',
                reason: 'Repeated policy violations or spam reports.',
                strikeCount: strike.strikeCount,
              });
              emitShadowThought();
            } else {
              socket.emit('thoughtRejected', {
                message: "Thought doesn't meet community guidelines.",
                strikesRemaining: Math.max(0, MAX_SPAM_STRIKES - strike.strikeCount),
              });
            }
          }
          return;
        }

        if (content.length > MAX_THOUGHT_LENGTH) {
          socket.emit('error', { message: `Thought must be under ${MAX_THOUGHT_LENGTH} characters.` });
          return;
        }

        const moderation = await classifyThought(content);
        const isBullshit = moderation.isToxic;
        const shouldRerouteNonToxicBullshit = moderation.category === 'BULLSHIT' && !moderation.isToxic;
        const effectiveModeration = shouldRerouteNonToxicBullshit
          ? {
            ...moderation,
            category: 'REFLECTIVE',
            reasoning: moderation.reasoning || 'Allowed as non-toxic; routed to reflective.',
            aiScore: clampScore(moderation.aiScore),
          }
          : moderation;

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
            customExpiresAt: customExpiryForUser,
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
              socket.emit('shadowBanNotice', {
                message: 'Your posts are currently hidden from other users.',
                reason: 'Repeated policy violations or spam reports.',
                strikeCount: strike.strikeCount,
              });
              emitShadowThought();
            } else {
              socket.emit('thoughtRejected', {
                message: "Thought doesn't meet community guidelines.",
                strikesRemaining: Math.max(0, MAX_SPAM_STRIKES - strike.strikeCount),
              });
            }
          }
          return;
        }

        const routeRoom: MehfilRoom = effectiveModeration.category === 'REFLECTIVE' ? 'REFLECTIVE' : 'ACADEMIC';
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
          ai_tags: effectiveModeration.suggestedTags,
          ai_score: clampScore(effectiveModeration.aiScore),
          status: 'approved',
          moderation_reason: effectiveModeration.reasoning,
          is_toxic: false,
          expires_at: customExpiryForUser,
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
          commentsCount: 0,
          createdAt: now,
          hasReacted: false,
          category: routeRoom,
          aiTags: effectiveModeration.suggestedTags,
          aiScore: clampScore(effectiveModeration.aiScore),
        };

        if (requestedRoom !== routeRoom) {
          socket.emit('thoughtRerouted', {
            room: routeRoom,
            reason: effectiveModeration.reasoning,
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

    socket.on('deleteThought', async (data: { thoughtId: string }) => {
      try {
        const userId = socketToUser.get(socket.id);
        if (!userId) return;

        const thought = await collections.mehfilThoughts().findOne({ id: data.thoughtId });
        if (!thought) {
          socket.emit('error', { message: 'Thought not found' });
          return;
        }

        if (thought.user_id !== userId) {
          socket.emit('error', { message: 'You can only delete your own thoughts' });
          return;
        }

        await collections.mehfilThoughts().deleteOne({ id: data.thoughtId });

        // Broadcast deletion event
        const room = normalizeRoom(thought.category || 'ACADEMIC');
        mehfil.to(toRoomName(room)).emit('thoughtDeleted', { thoughtId: data.thoughtId });
        socket.emit('thoughtDeleted', { thoughtId: data.thoughtId }); // Ensure sender gets it too

      } catch (err) {
        console.error('[MEHFIL] Delete thought error:', err);
        socket.emit('error', { message: 'Failed to delete thought' });
      }
    });

    socket.on('editThought', async (data: { thoughtId: string; content: string }) => {
      try {
        const userId = socketToUser.get(socket.id);
        if (!userId) return;

        const thoughtId = String(data?.thoughtId || '').trim();
        const content = String(data?.content || '').trim();

        if (!thoughtId) {
          socket.emit('error', { message: 'Thought id is required' });
          return;
        }
        if (!content) {
          socket.emit('error', { message: 'Thought content is required' });
          return;
        }
        if (content.length < MIN_THOUGHT_LENGTH) {
          socket.emit('error', { message: `Thought must be at least ${MIN_THOUGHT_LENGTH} characters.` });
          return;
        }
        if (content.length > MAX_THOUGHT_LENGTH) {
          socket.emit('error', { message: `Thought must be under ${MAX_THOUGHT_LENGTH} characters.` });
          return;
        }

        const thought = await collections.mehfilThoughts().findOne({ id: thoughtId });
        if (!thought) {
          socket.emit('error', { message: 'Thought not found' });
          return;
        }

        if (thought.user_id !== userId) {
          socket.emit('error', { message: 'You can only edit your own thoughts' });
          return;
        }

        const updatedAt = new Date();
        await collections.mehfilThoughts().updateOne(
          { id: thoughtId },
          {
            $set: {
              content,
              updated_at: updatedAt,
            },
          },
        );

        const updatedThought = await collections.mehfilThoughts().findOne({ id: thoughtId });
        if (!updatedThought) return;

        const room = normalizeRoom(updatedThought.category || 'ACADEMIC');
        const payload = {
          isAnonymous: Boolean(updatedThought.is_anonymous),
          id: updatedThought.id,
          userId: updatedThought.is_anonymous ? '' : updatedThought.user_id,
          authorName: updatedThought.is_anonymous ? 'Anonymous User' : updatedThought.author_name,
          authorAvatar: updatedThought.is_anonymous ? null : updatedThought.author_avatar,
          content: updatedThought.content,
          imageUrl: updatedThought.image_url,
          relatableCount: updatedThought.relatable_count || 0,
          createdAt: updatedThought.created_at,
          category: normalizeCategory(updatedThought.category || 'ACADEMIC'),
          aiTags: Array.isArray(updatedThought.ai_tags) ? updatedThought.ai_tags : [],
          aiScore: typeof updatedThought.ai_score === 'number' ? updatedThought.ai_score : null,
        };

        socket.emit('thoughtUpdated', payload);
        socket.broadcast.to(toRoomName(room)).emit('thoughtUpdated', payload);
      } catch (err) {
        console.error('[MEHFIL] Edit thought error:', err);
        socket.emit('error', { message: 'Failed to edit thought' });
      }
    });

    socket.on('disconnect', async () => {
      const userId = socketToUser.get(socket.id);
      if (userId) {
        const user = connectedUsers.get(userId);
        if (user?.socketId === socket.id) {
          connectedUsers.delete(userId);
          console.log(`[MEHFIL] User disconnected: ${user.name}`);
        }
        socketToUser.delete(socket.id);
        markDmUserOffline(userId);
        await redisDelKey(redisClient, `dm:socket:${userId}`);

        for (const [roomId, room] of dmRooms.entries()) {
          if (room.user1 !== userId && room.user2 !== userId) continue;
          const otherUserId = room.user1 === userId ? room.user2 : room.user1;
          const otherSocketId = await getActiveSocketIdForUser(otherUserId);
          if (otherSocketId) {
            mehfil.to(otherSocketId).emit('dm:user_left', { roomId, userId });
            const otherSocket = mehfil.sockets.get(otherSocketId);
            otherSocket?.leave(roomId);
          }
          await redisDelKey(redisClient, `dm:room:${roomId}`);
          dmRooms.delete(roomId);
          clearDmRoomTimer(roomId);
        }
      }
      mehfil.emit('onlineCount', connectedUsers.size);
    });
  });

  return io;
}
