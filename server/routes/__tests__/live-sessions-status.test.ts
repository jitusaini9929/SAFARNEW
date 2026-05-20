import { describe, expect, it } from 'vitest';
import { canManageSession, isValidStatusTransition, shouldNotifyLiveSessionStart } from '../live-sessions';

describe('live session status transitions', () => {
  it('allows scheduled -> live -> ended', () => {
    expect(isValidStatusTransition('scheduled', 'live')).toBe(true);
    expect(isValidStatusTransition('live', 'ended')).toBe(true);
  });

  it('blocks ended -> live', () => {
    expect(isValidStatusTransition('ended', 'live')).toBe(false);
  });

  it('blocks cancelled -> live', () => {
    expect(isValidStatusTransition('cancelled', 'live')).toBe(false);
  });
});

describe('live session go-live notifications', () => {
  it('notifies when transitioning to live from a non-live status', () => {
    expect(shouldNotifyLiveSessionStart('scheduled', 'live')).toBe(true);
  });

  it('does not notify when already live', () => {
    expect(shouldNotifyLiveSessionStart('live', 'live')).toBe(false);
  });

  it('does not notify when ending or cancelling', () => {
    expect(shouldNotifyLiveSessionStart('live', 'ended')).toBe(false);
    expect(shouldNotifyLiveSessionStart('scheduled', 'cancelled')).toBe(false);
  });
});

describe('live session management access', () => {
  it('allows admin or teacher', () => {
    expect(
      canManageSession({ userId: 't1', isAdmin: false }, { teacher_id: 't1', created_by: 'x' }),
    ).toBe(true);
    expect(
      canManageSession({ userId: 'a1', isAdmin: true }, { teacher_id: 't1', created_by: 't1' }),
    ).toBe(true);
  });

  it('denies other users', () => {
    expect(
      canManageSession({ userId: 'u2', isAdmin: false }, { teacher_id: 't1', created_by: 't1' }),
    ).toBe(false);
  });
});
