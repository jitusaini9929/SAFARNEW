import { Router, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { collections } from '../db';
import { requireAuth } from '../middleware/auth';
import { notifyLiveSessionStarted } from '../services/push-notifications';
import { buildYouTubeUrls, parseYouTubeVideoInput } from '../utils/youtubeLive';
import { getMehfilNamespace } from './mehfil-socket';

type LiveSessionStatus = 'scheduled' | 'live' | 'ended' | 'cancelled';

const router = Router();
const ALLOWED_STATUS: Set<LiveSessionStatus> = new Set(['scheduled', 'live', 'ended', 'cancelled']);

export const liveSessionChats = new Map<string, Array<{ name: string; text: string }>>();

export function isValidStatusTransition(from: LiveSessionStatus, to: LiveSessionStatus): boolean {
  if (from === to) return true;
  if (from === 'cancelled') return false;
  if (from === 'ended') return false;
  if (from === 'scheduled') return to === 'live' || to === 'cancelled';
  if (from === 'live') return to === 'ended' || to === 'cancelled';
  return false;
}

export function shouldNotifyLiveSessionStart(
  previousStatus: LiveSessionStatus,
  newStatus: LiveSessionStatus,
): boolean {
  return previousStatus !== 'live' && newStatus === 'live';
}

function normalizeStatus(value: unknown): LiveSessionStatus | null {
  if (typeof value !== 'string') return null;
  const status = value.trim().toLowerCase() as LiveSessionStatus;
  return ALLOWED_STATUS.has(status) ? status : null;
}

export function canManageSession(
  user: { userId: string; isAdmin: boolean },
  session: any,
): boolean {
  if (user.isAdmin) return true;
  const teacherId = String(session.teacher_id || session.created_by || '');
  return teacherId.length > 0 && teacherId === user.userId;
}

async function isUserEnrolledInCourse(userId: string, courseId: string): Promise<boolean> {
  const enrollment = await collections.courseEnrollments().findOne(
    { user_id: userId, course_id: courseId },
    { projection: { _id: 1 } },
  );
  return !!enrollment;
}

async function resolveHostName(userId: string): Promise<string> {
  const host = await collections.users().findOne({ id: userId }, { projection: { name: 1 } });
  const hostName = String(host?.name || 'Admin').trim();
  return hostName || 'Admin';
}

function scheduleLiveSessionNotification(params: {
  sessionId: string;
  sessionTitle: string;
  hostUserId: string;
}): void {
  void resolveHostName(params.hostUserId)
    .then((hostName) =>
      notifyLiveSessionStarted({
        sessionId: params.sessionId,
        sessionTitle: params.sessionTitle,
        hostName,
      }),
    )
    .catch((error) => {
      console.error('Live session push notification error:', error);
    });
}

function toApiModel(doc: any, user: { userId: string; isAdmin: boolean }) {
  return {
    id: doc.id,
    title: doc.title,
    description: doc.description || null,
    courseId: doc.course_id,
    teacherId: doc.teacher_id || null,
    scheduledStartAt: doc.scheduled_start_at || null,
    scheduledEndAt: doc.scheduled_end_at || null,
    status: doc.status,
    youtubeVideoId: doc.youtube_video_id || null,
    youtubeWatchUrl: doc.youtube_watch_url || null,
    youtubeEmbedUrl: doc.youtube_embed_url || null,
    thumbnailUrl: doc.thumbnail_url || null,
    isChatEnabled: doc.is_chat_enabled !== false,
    isRecordingAvailable: !!doc.is_recording_available,
    recordingVideoId: doc.recording_video_id || null,
    resources: Array.isArray(doc.resources) ? doc.resources : [],
    canManage: canManageSession(user, doc),
    createdBy: doc.created_by || null,
    createdAt: doc.created_at || null,
    updatedAt: doc.updated_at || null,
  };
}

async function userCanAccessSession(
  user: { userId: string; isAdmin: boolean },
  session: any,
): Promise<boolean> {
  if (user.isAdmin) return true;
  if (canManageSession(user, session)) return true;
  const status = String(session.status || '').toLowerCase();
  if (status === 'live' || status === 'scheduled') return true;
  if (session.course_id) {
    return isUserEnrolledInCourse(user.userId, session.course_id);
  }
  return false;
}

router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const title = String(req.body?.title || '').trim();
    const courseId = String(req.body?.courseId || req.body?.course_id || '').trim();
    const description = String(req.body?.description || '').trim() || null;
    const scheduledStartAt = req.body?.scheduledStartAt || req.body?.scheduled_start_at || null;
    const scheduledEndAt = req.body?.scheduledEndAt || req.body?.scheduled_end_at || null;
    const status = normalizeStatus(req.body?.status) || 'scheduled';
    const youtubeInput = req.body?.youtubeUrl || req.body?.youtube_video_id || req.body?.youtubeVideoId;

    if (!title) {
      return res.status(400).json({ message: 'title is required' });
    }

    let youtubeVideoId: string | null = null;
    let youtubeWatchUrl: string | null = null;
    let youtubeEmbedUrl: string | null = null;
    let thumbnailUrl: string | null = null;

    if (youtubeInput) {
      const parsed = parseYouTubeVideoInput(youtubeInput);
      if (!parsed) return res.status(400).json({ message: 'Invalid YouTube URL or video id' });
      const urls = buildYouTubeUrls(parsed.videoId);
      youtubeVideoId = parsed.videoId;
      youtubeWatchUrl = urls.watchUrl;
      youtubeEmbedUrl = urls.embedUrl;
      thumbnailUrl = urls.thumbnailUrl;
    }

    const teacherId = user.isAdmin && req.body?.teacherId
      ? String(req.body.teacherId).trim()
      : user.userId;

    const doc = {
      id: uuidv4(),
      title,
      description,
      course_id: courseId || null,
      teacher_id: teacherId,
      scheduled_start_at: scheduledStartAt ? new Date(scheduledStartAt) : null,
      scheduled_end_at: scheduledEndAt ? new Date(scheduledEndAt) : null,
      status,
      youtube_video_id: youtubeVideoId,
      youtube_watch_url: youtubeWatchUrl,
      youtube_embed_url: youtubeEmbedUrl,
      thumbnail_url: thumbnailUrl,
      is_chat_enabled: req.body?.isChatEnabled !== false,
      is_recording_available: false,
      recording_video_id: null,
      resources: Array.isArray(req.body?.resources) ? req.body.resources : [],
      created_by: user.userId,
      created_at: new Date(),
      updated_at: new Date(),
      is_deleted: false,
    };

    await collections.liveSessions().insertOne(doc);

    if (status === 'live') {
      scheduleLiveSessionNotification({
        sessionId: doc.id,
        sessionTitle: title,
        hostUserId: user.userId,
      });
    }

    return res.status(201).json({ liveSession: toApiModel(doc, user) });
  } catch (error) {
    console.error('Create live session error:', error);
    return res.status(500).json({ message: 'Failed to create live session' });
  }
});

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const courseId = String(req.query.courseId || '').trim();
    const statusQuery = typeof req.query.status === 'string' ? req.query.status.trim().toLowerCase() : null;

    if (courseId && !user.isAdmin) {
      const enrolled = await isUserEnrolledInCourse(user.userId, courseId);
      if (!enrolled) {
        return res.status(403).json({ message: 'Not enrolled in this course' });
      }
    }

    const query: Record<string, unknown> = {
      is_deleted: { $ne: true },
    };
    if (courseId) {
      query.course_id = courseId;
    }
    if (statusQuery === 'active') {
      query.status = { $in: ['scheduled', 'live'] };
    } else if (statusQuery && ALLOWED_STATUS.has(statusQuery as LiveSessionStatus)) {
      query.status = statusQuery;
    }

    const rows = await collections.liveSessions().find(query).sort({ scheduled_start_at: -1 }).toArray();
    const accessible: typeof rows = [];
    for (const row of rows) {
      if (await userCanAccessSession(user, row)) {
        accessible.push(row);
      }
    }
    return res.json({ liveSessions: accessible.map((row) => toApiModel(row, user)) });
  } catch (error) {
    console.error('List live sessions error:', error);
    return res.status(500).json({ message: 'Failed to list live sessions' });
  }
});

router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const session = await collections.liveSessions().findOne({ id: req.params.id, is_deleted: { $ne: true } });
    if (!session) return res.status(404).json({ message: 'Live session not found' });

    if (!(await userCanAccessSession(user, session))) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    return res.json({ liveSession: toApiModel(session, user) });
  } catch (error) {
    console.error('Get live session error:', error);
    return res.status(500).json({ message: 'Failed to fetch live session' });
  }
});

router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const session = await collections.liveSessions().findOne({ id: req.params.id, is_deleted: { $ne: true } });
    if (!session) return res.status(404).json({ message: 'Live session not found' });
    if (!canManageSession(user, session)) return res.status(403).json({ message: 'Forbidden' });

    const patch: Record<string, unknown> = { updated_at: new Date() };
    if (req.body?.title) patch.title = String(req.body.title).trim();
    if (req.body?.description !== undefined) patch.description = String(req.body.description || '').trim() || null;
    if (req.body?.scheduledStartAt) patch.scheduled_start_at = new Date(req.body.scheduledStartAt);
    if (req.body?.scheduledEndAt) patch.scheduled_end_at = new Date(req.body.scheduledEndAt);
    if (req.body?.isChatEnabled !== undefined) patch.is_chat_enabled = !!req.body.isChatEnabled;
    if (Array.isArray(req.body?.resources)) patch.resources = req.body.resources;

    await collections.liveSessions().updateOne({ id: session.id }, { $set: patch });
    const updated = await collections.liveSessions().findOne({ id: session.id });
    return res.json({ liveSession: toApiModel(updated, user) });
  } catch (error) {
    console.error('Update live session error:', error);
    return res.status(500).json({ message: 'Failed to update live session' });
  }
});

router.patch('/:id/start', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const session = await collections.liveSessions().findOne({ id: req.params.id, is_deleted: { $ne: true } });
    if (!session) return res.status(404).json({ message: 'Live session not found' });
    if (!canManageSession(user, session)) return res.status(403).json({ message: 'Forbidden' });

    const youtubeInput = req.body?.youtubeUrl || req.body?.youtube_video_id;
    const parsed = parseYouTubeVideoInput(youtubeInput);
    if (!parsed) return res.status(400).json({ message: 'youtubeUrl is required' });

    const urls = buildYouTubeUrls(parsed.videoId);
    const previousStatus = session.status as LiveSessionStatus;

    const patch = {
      status: 'live' as LiveSessionStatus,
      youtube_video_id: parsed.videoId,
      youtube_watch_url: urls.watchUrl,
      youtube_embed_url: urls.embedUrl,
      thumbnail_url: urls.thumbnailUrl,
      updated_at: new Date(),
    };

    await collections.liveSessions().updateOne({ id: session.id }, { $set: patch });

    if (shouldNotifyLiveSessionStart(previousStatus, 'live')) {
      scheduleLiveSessionNotification({
        sessionId: session.id,
        sessionTitle: String(session.title || 'Live session'),
        hostUserId: user.userId,
      });
    }

    const updated = await collections.liveSessions().findOne({ id: session.id });

    // Broadcast real-time status change to all socket clients watching this session
    try {
      const mehfil = getMehfilNamespace();
      if (mehfil) {
        mehfil.to(`live:${session.id}`).emit('live:status_changed', {
          sessionId: session.id,
          status: 'live',
          youtubeEmbedUrl: urls.embedUrl,
          youtubeVideoId: parsed.videoId,
        });
      }
    } catch (broadcastErr) {
      console.error('[LIVE] Failed to broadcast live:status_changed (start):', broadcastErr);
    }

    return res.json({ liveSession: toApiModel(updated, user) });
  } catch (error) {
    console.error('Start live session error:', error);
    return res.status(500).json({ message: 'Failed to start live session' });
  }
});

router.patch('/:id/end', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const session = await collections.liveSessions().findOne({ id: req.params.id, is_deleted: { $ne: true } });
    if (!session) return res.status(404).json({ message: 'Live session not found' });
    if (!canManageSession(user, session)) return res.status(403).json({ message: 'Forbidden' });

    const recordingInput = req.body?.recordingVideoId || req.body?.recording_video_id;
    const patch: Record<string, unknown> = {
      status: 'ended',
      updated_at: new Date(),
    };

    if (recordingInput) {
      const parsed = parseYouTubeVideoInput(recordingInput);
      if (parsed) {
        const urls = buildYouTubeUrls(parsed.videoId);
        patch.recording_video_id = parsed.videoId;
        patch.is_recording_available = true;
        patch.youtube_video_id = parsed.videoId;
        patch.youtube_watch_url = urls.watchUrl;
        patch.youtube_embed_url = urls.embedUrl;
        patch.thumbnail_url = urls.thumbnailUrl;
      }
    } else if (session.youtube_video_id) {
      patch.recording_video_id = session.youtube_video_id;
      patch.is_recording_available = true;
    }

    await collections.liveSessions().updateOne({ id: session.id }, { $set: patch });
    liveSessionChats.delete(session.id);
    const updated = await collections.liveSessions().findOne({ id: session.id });

    // Broadcast real-time status change to all socket clients watching this session
    try {
      const mehfil = getMehfilNamespace();
      if (mehfil) {
        mehfil.to(`live:${session.id}`).emit('live:status_changed', {
          sessionId: session.id,
          status: 'ended',
          recordingVideoId: updated?.recording_video_id || null,
        });
      }
    } catch (broadcastErr) {
      console.error('[LIVE] Failed to broadcast live:status_changed (end):', broadcastErr);
    }

    return res.json({ liveSession: toApiModel(updated, user) });
  } catch (error) {
    console.error('End live session error:', error);
    return res.status(500).json({ message: 'Failed to end live session' });
  }
});

router.patch('/:id/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const session = await collections.liveSessions().findOne({ id: req.params.id, is_deleted: { $ne: true } });
    if (!session) return res.status(404).json({ message: 'Live session not found' });
    if (!canManageSession(user, session)) return res.status(403).json({ message: 'Forbidden' });

    const status = normalizeStatus(req.body?.status);
    if (!status) return res.status(400).json({ message: 'Invalid status' });

    const previousStatus = session.status as LiveSessionStatus;
    if (!isValidStatusTransition(previousStatus, status)) {
      return res.status(400).json({ message: `Invalid status transition: ${previousStatus} -> ${status}` });
    }

    await collections.liveSessions().updateOne(
      { id: session.id },
      { $set: { status, updated_at: new Date() } },
    );

    if (status === 'ended' || status === 'cancelled') {
      liveSessionChats.delete(session.id);
    }

    if (shouldNotifyLiveSessionStart(previousStatus, status)) {
      scheduleLiveSessionNotification({
        sessionId: session.id,
        sessionTitle: String(session.title || 'Live session'),
        hostUserId: user.userId,
      });
    }

    const updated = await collections.liveSessions().findOne({ id: session.id });
    return res.json({ liveSession: toApiModel(updated, user) });
  } catch (error) {
    console.error('Update live session status error:', error);
    return res.status(500).json({ message: 'Failed to update live session status' });
  }
});

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const session = await collections.liveSessions().findOne({ id: req.params.id, is_deleted: { $ne: true } });
    if (!session) return res.status(404).json({ message: 'Live session not found' });
    if (!canManageSession(user, session)) return res.status(403).json({ message: 'Forbidden' });

    await collections.liveSessions().updateOne(
      { id: session.id },
      { $set: { is_deleted: true, status: 'cancelled', updated_at: new Date() } },
    );
    liveSessionChats.delete(session.id);

    return res.json({ ok: true });
  } catch (error) {
    console.error('Delete live session error:', error);
    return res.status(500).json({ message: 'Failed to delete live session' });
  }
});

export const liveSessionRoutes = router;
