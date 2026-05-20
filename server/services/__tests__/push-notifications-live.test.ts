import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../../db', () => ({
  collections: {
    deviceTokens: () => ({
      find: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
    }),
    notificationDeliveryLog: () => ({
      insertOne: vi.fn(),
    }),
  },
}));

describe('notifyLiveSessionStarted', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('broadcasts live session payload to all active tokens', async () => {
    const pushNotifications = await import('../push-notifications');
    const spy = vi.spyOn(pushNotifications, 'sendAnnouncementToActiveTokens').mockResolvedValue([]);

    await pushNotifications.notifyLiveSessionStarted({
      sessionId: 'session-1',
      sessionTitle: 'Physics Live',
      hostName: 'Anubhav',
    });

    expect(spy).toHaveBeenCalledWith({
      type: 'live_session',
      title: 'Anubhav is live',
      body: 'Join now: Physics Live',
      channel: 'course_updates',
      deepLink: 'safar://live/session/session-1',
      priority: 'high',
    });
  });
});
