# Ekagra Mode Android Native Implementation Spec

Source scope:

- Web route: `/study`
- Analytics route: `/study/analytics`
- Client page: `client/pages/StudyWithMe.tsx`
- Analytics page: `client/pages/FocusAnalytics.tsx`
- Runtime state: `client/contexts/FocusContext.tsx`
- Client API layer: `client/utils/dataService.ts`
- Session helpers: `client/services/ekagraSessionService.ts`
- Analytics helper: `client/services/ekagraAnalyticsService.ts`
- Timer sync hook: `client/hooks/useEkagraTimerSync.ts`
- Shared types: `shared/api.ts`
- Server route: `server/routes/ekagra-sessions.ts`
- Legacy/general focus route: `server/routes/focus-sessions.ts`
- Database collections: `ekagra_mode_sessions`, `focus_sessions`, `focus_session_logs`, `goals`

This document is for rebuilding Ekagra Mode as an Android native frontend. It includes timer behavior, session APIs, linked-goal behavior, music/theme features, analytics, and persistence rules.

## 1. Authentication And API Rules

All Ekagra session APIs are protected.

Base URL:

```text
{API_BASE}/api
```

Auth rules:

- Use access token in `Authorization: Bearer <token>`.
- Preserve refresh/session cookies if backend requires them.
- On `401`, call `POST /api/auth/refresh`, update access token, and retry.
- Every request should be sent as authenticated.

Important backend route mounts:

```text
/api/ekagra-sessions
/api/focus-sessions
/api/goals
```

## 2. Routes And Navigation

Website routes:

```text
/study
/study?goalId={goalId}&goalTitle={encodedTitle}
/study?view=analytics
/study/analytics
```

Android equivalents:

- Ekagra timer screen.
- Ekagra analytics screen/tab.
- Deep link/navigation argument support:

```text
goalId: string
goalTitle: string
view: "analytics" optional
```

Goal deep-link behavior:

- If `goalId` is present, set `associatedGoalId`.
- If `goalTitle` is present, set `associatedGoalTitle`.
- Clear the query params on web after consuming them. Android should consume navigation args once.

## 3. Core Concepts

Ekagra Mode has two layers:

- Local timer runtime: immediate countdown, music, PiP, local UI.
- Server runtime session: persisted active/paused sessions used for recovery, switching, history, and analytics.

Session rules:

- Only one Ekagra session can be active at a time.
- Multiple paused sessions can exist.
- Open sessions are only `active` or `paused`.
- Completed/discarded sessions leave the open-session list.
- Goals stay in the Goals domain; Ekagra only links to them by `goalId`.
- Completing a linked focus session marks the goal complete.
- Completing a named session does not mark any goal complete.

## 4. Shared Data Types

From `shared/api.ts`:

```ts
type EkagraSessionSource =
  | "manual"
  | "imported"
  | "goal_created"
  | "goal_continue"
  | "carry_forward";

type EkagraSessionStatus =
  | "active"
  | "paused"
  | "completed"
  | "ended_early"
  | "discarded";

type EkagraTimerMode = "Timer" | "short" | "long";
type EkagraSessionType = "goal" | "named";
type EkagraAnalyticsSessionType = "focus" | "short_break" | "long_break";

interface EkagraModeSession {
  id: string;
  userId: string;
  goalId: string;
  goalTitle: string;
  sessionType?: EkagraSessionType;
  sessionTitle?: string;
  source: EkagraSessionSource;
  status: EkagraSessionStatus;
  mode: EkagraTimerMode;
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  importedFromGoal?: boolean;
  pauseCount?: number;
  sessionStartedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  endedAt?: string | null;
  discardedAt?: string | null;
}
```

Backend also returns snake_case aliases:

- `user_id`
- `goal_id`
- `goal_title`
- `session_type`
- `session_title`
- `total_seconds`
- `remaining_seconds`
- `is_running`
- `imported_from_goal`
- `pause_count`
- `session_started_at`
- `created_at`
- `updated_at`
- `completed_at`
- `ended_at`
- `discarded_at`

Android should normalize both formats.

## 5. Timer Runtime Model

Local state from `FocusContext`:

```ts
interface FocusRuntimeSnapshot {
  mode: "Timer" | "short" | "long";
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  associatedGoalId: string | null;
  associatedGoalTitle: string | null;
  sessionStartedAt?: string | null;
}
```

Timer defaults:

- Focus timer: 25 minutes.
- Short break: 5 minutes.
- Long break: 15 minutes.

UI limits:

- Focus timer minimum: 5 minutes.
- Focus timer step: 5 minutes.
- Focus timer slider max: 120 minutes.
- Break minimum: 5 minutes.
- Break step: 5 minutes.
- Break max: 60 minutes.

Timer modes:

- `Timer`: focus session.
- `short`: short break session.
- `long`: long break session.

Runtime behavior:

- Start begins countdown and music.
- Pause stops countdown and music.
- Reset stops countdown, music, clears associated goal, and resets remaining time to total.
- Mode switch resets the timer to that mode's configured duration.
- Timer uses timestamp catch-up, not just decrement-by-one; if app is backgrounded, it catches up when visible/focused.
- If missed tick gap exceeds 10 minutes, web pauses the timer to avoid a huge accidental catch-up.

Android timer recommendation:

- Use a monotonic clock for elapsed time.
- Store `startedAt`, `totalSeconds`, `remainingSecondsAtPause`, and running state.
- On foreground, recompute remaining time from elapsed monotonic/wall time.
- Keep server session snapshot in sync on pause/background.

## 6. Ekagra Session API Endpoints

### 6.1 List Open Sessions

```http
GET /api/ekagra-sessions
```

Behavior:

- Returns open sessions only: `active` and `paused`.
- Sorted by `updated_at desc`.
- Limit: 40.

Response:

```ts
{
  sessions: EkagraModeSession[];
}
```

Android usage:

- Load on screen open.
- Poll while screen is visible.
- Refresh after activate/pause/resume/complete/discard/delete.

Web cache:

- `dataService.getEkagraSessions()` caches for 30 seconds unless `forceFresh`.

### 6.2 Get Active Session

```http
GET /api/ekagra-sessions/active
```

Behavior:

- Returns latest active session for user or null.

Response:

```ts
{
  session: EkagraModeSession | null;
}
```

Android usage:

- Restore current active session.
- Determine whether another active session conflict exists.

Web cache:

- Cached for 30 seconds unless `forceFresh`.

### 6.3 Activate Session

```http
POST /api/ekagra-sessions/activate
Content-Type: application/json
```

Payload for linked goal session:

```ts
{
  goalId: string;
  goalTitle?: string;
  sessionType?: "goal";
  source?: EkagraSessionSource;
  importedFromGoal?: boolean;
  overrideActive?: boolean;
  mode?: "Timer" | "short" | "long";
  totalSeconds?: number;
  remainingSeconds?: number;
  isRunning?: boolean;
  sessionStartedAt?: string | null;
}
```

Payload for named/unlinked session:

```ts
{
  sessionType: "named";
  sessionTitle: string;
  source?: "manual";
  overrideActive?: boolean;
  mode?: "Timer" | "short" | "long";
  totalSeconds?: number;
  remainingSeconds?: number;
  isRunning?: boolean;
  sessionStartedAt?: string | null;
}
```

Server defaults:

- `mode`: `Timer`.
- `totalSeconds`: 25 minutes.
- `remainingSeconds`: total seconds.
- `isRunning`: false unless supplied.
- `status`: `active`.
- `pauseCount`: 0.
- For named sessions, backend stores `goal_id = named:{sessionId}`.

Validation:

- Named session requires `sessionTitle`.
- Goal session requires `goalId`.
- Goal session checks the goal exists and belongs to the user.
- Completed or archived goals cannot be focused.

Conflict behavior:

- If a different active session already exists and `overrideActive` is false:

```ts
{
  message: "An Ekagra session is already active";
  code: "ACTIVE_SESSION_CONFLICT";
  activeSession: EkagraModeSession;
}
```

- If `overrideActive` is true, existing active sessions are paused and the new session becomes active.

Existing open session behavior:

- If a goal already has an active/paused session, activation reuses it and sets it active.

Response:

```ts
{
  session: EkagraModeSession;
}
```

### 6.4 Update Session Snapshot / Pause / Resume

```http
PATCH /api/ekagra-sessions/{sessionId}
Content-Type: application/json
```

Supported payload:

```ts
{
  status?: "active" | "paused" | "completed" | "ended_early" | "discarded";
  mode?: "Timer" | "short" | "long";
  totalSeconds?: number;
  remainingSeconds?: number;
  isRunning?: boolean;
  sessionStartedAt?: string | null;
  goalTitle?: string;
  source?: EkagraSessionSource;
  importedFromGoal?: boolean;
}
```

Important status effects:

- `paused`: `is_running = false`, increments `pause_count`.
- `active`: pauses all other active sessions for the user.
- `completed`: sets `completed_at`, `ended_at`, `is_running = false`, `remaining_seconds = 0`.
- `ended_early`: sets `ended_at`, `is_running = false`.
- `discarded`: sets `discarded_at`, `is_running = false`.

Validation:

- Invalid session ID returns `404`.
- Invalid status returns `400`.
- Empty update body returns `400`.

Response:

```ts
{
  session: EkagraModeSession;
}
```

Android background sync:

- On app background/close, send a best-effort PATCH with:

```ts
{
  status: "paused";
  mode;
  totalSeconds;
  remainingSeconds: Math.max(1, remainingSeconds);
  isRunning: false;
  sessionStartedAt;
  goalTitle;
}
```

The web does this using `pagehide`/`beforeunload` with `keepalive`.

### 6.5 Complete Session

```http
POST /api/ekagra-sessions/{sessionId}/complete
Content-Type: application/json
```

Payload:

```ts
{
  mode?: "Timer" | "short" | "long";
  totalSeconds?: number;
  elapsedSeconds?: number;
  remainingSeconds?: number;
  sessionStartedAt?: string | null;
}
```

Elapsed time resolution:

- Prefer `elapsedSeconds` if supplied.
- Else use `totalSeconds - remainingSeconds`.
- Clamp elapsed seconds between 0 and 24 hours.

Behavior:

- Creates/updates a row in `focus_sessions`.
- Creates a row in `focus_session_logs`.
- Deletes the open row from `ekagra_mode_sessions`.
- Returns the completed session snapshot.

Linked goal completion:

- If mode is `Timer` and session is linked to a real goal:
  - `completed = true`
  - `completed_at = now`
  - `completed_via_focus = true`
  - `status_value = completed`
  - `lifecycle_status = active`
  - `achieved_value = target_value` if target exists
  - for binary goals, `achieved_value = 1`

Named sessions:

- `goal_id` starts with `named:`.
- No goal is completed.

Response:

```ts
{
  session: EkagraModeSession;
}
```

### 6.6 Discard Session

```http
POST /api/ekagra-sessions/{sessionId}/discard
Content-Type: application/json
```

Behavior:

- Deletes the open session from `ekagra_mode_sessions`.
- Does not write focus analytics.
- Does not complete any goal.
- Returns a discarded snapshot.

Response:

```ts
{
  session: EkagraModeSession;
}
```

### 6.7 Delete Session

```http
DELETE /api/ekagra-sessions/{sessionId}
```

Behavior:

- Deletes active/paused open session.
- Does not write analytics.
- Does not complete a goal.

Response:

```ts
{
  ok: true;
  deletedId: string;
}
```

## 7. Ekagra Analytics API

```http
GET /api/ekagra-sessions/analytics
```

Behavior:

- Reads from `focus_sessions`.
- Includes focus, short break, and long break data.
- Joins linked goal titles from `goals`.
- Returns completed closed sessions, not open runtime sessions.
- Cache-Control is set to medium cache on server.

Response:

```ts
interface EkagraAnalyticsStats {
  totalFocusMinutes: number;
  totalBreakMinutes: number;
  timerUsageCount: number;
  breakSessionsCount: number;
  shortBreakSessionsCount: number;
  longBreakSessionsCount: number;
  longDurationSessionCount: number;
  averageTimerMinutes: number;
  mostUsedTimerDurationMinutes: number | null;
  totalSessions: number;
  completedSessions: number;
  endedEarlySessions: number;
  abandonedSessions: number;
  weeklyData: number[];
  weeklyBreaks: number[];
  focusStreak: number;
  hourlyDistribution: number[];
  recentSessions: EkagraAnalyticsRecentSession[];
  focusSessions: EkagraAnalyticsFocusSession[];
  topTasks: EkagraAnalyticsTopTask[];
  timerDurationUsage: EkagraTimerDurationUsage[];
}
```

Session row shapes:

```ts
interface EkagraAnalyticsRecentSession {
  id: string;
  startedAt: string | null;
  endedAt: string | null;
  durationMinutes: number;
  actualMinutes: number;
  completed: boolean;
  status: "completed";
  taskText: string | null;
  associatedGoalId?: string | null;
  pauseCount: number;
  sessionType: "focus" | "short_break" | "long_break";
}

interface EkagraAnalyticsFocusSession {
  id: string;
  startedAt: string | null;
  endedAt: string | null;
  durationMinutes: number;
  actualMinutes: number;
  status: "completed";
  rawStatus: "completed" | "ended_early";
  taskText: string | null;
  associatedGoalId?: string | null;
  pauseCount: number;
}

interface EkagraTimerDurationUsage {
  durationMinutes: number;
  count: number;
  sessionType: "focus" | "short_break" | "long_break";
}
```

Current web analytics screen tabs:

- `Overview`
- `Sessions`

Overview metrics:

- Time spent on timer.
- Breaks taken, split into short/long.
- Long duration timer uses, defined as focus timer duration >= 60 minutes.
- Average timer duration.
- Most used timer duration.
- Total sessions and completed sessions.
- Timer duration usage donut chart.

Sessions tab:

- Lists all closed focus sessions.
- Shows task title, ended time, planned minutes, actual minutes, and pause count.

Web refresh behavior:

- Loads on mount.
- Refreshes when document becomes visible.
- Polls every 5 minutes.

Android recommendation:

- Refresh analytics on screen open and after any session completion.
- Consider pull-to-refresh.
- Cache locally only for UX; backend source of truth is `focus_sessions`.

## 8. Legacy/General Focus Session APIs

These are still present and may be useful for Android if you implement generic focus logging outside Ekagra runtime sessions.

### 8.1 Log Focus Session Directly

```http
POST /api/focus-sessions
Content-Type: application/json
```

Payload:

```ts
{
  plannedDurationMinutes?: number;
  actualDurationMinutes: number;
  breakMinutes?: number;
  completed?: boolean;
  startedAt?: string;
  completedAt?: string;
  associatedGoalId?: string | null;
  interrupted?: boolean;
  preStudyMood?: string;
  postStudyMood?: string;
  moodScore?: number;
}
```

Validation:

- `actualDurationMinutes` must be greater than 0.

Behavior:

- Inserts into `focus_sessions`.
- Inserts into `focus_session_logs`.
- Optionally inserts mood snapshot.
- Deduplicates by user, started/completed timestamps, actual duration, and associated goal.

### 8.2 General Focus Stats

```http
GET /api/focus-sessions/stats
```

Returns broader focus stats:

```ts
{
  totalFocusMinutes: number;
  totalBreakMinutes: number;
  totalSessions: number;
  completedSessions: number;
  endedEarlySessions: number;
  weeklyData: number[];
  weeklyBreaks: number[];
  focusStreak: number;
  goalsSet: number;
  goalsCompleted: number;
  hourlyDistribution: number[];
  recentSessions: Array<{
    id: string;
    startedAt: string;
    durationMinutes: number;
    actualMinutes: number;
    completed: boolean;
    taskText: string | null;
    pauseCount: number;
  }>;
}
```

### 8.3 Focus Time By Goal

```http
GET /api/focus-sessions/by-goal/{goalId}
```

Response:

```ts
{
  totalMinutes: number;
  sessionCount: number;
}
```

### 8.4 Focus Time By Goals

```http
POST /api/focus-sessions/by-goals
Content-Type: application/json
```

Payload:

```ts
{
  goalIds: string[];
  dayKey?: string;
}
```

Response:

```ts
Record<string, { totalMinutes: number; sessionCount: number }>
```

Note:

- Goal section currently uses `/api/goals/focus-summary`, which wraps similar aggregation with ownership checks.

## 9. Ekagra Screen Feature Inventory

### 9.1 Timer Card

Controls:

- Mode selector: Pomodoro (`Timer`), Short break (`short`), Long break (`long`).
- Main countdown display.
- Reset.
- Start/Pause.
- Picture-in-picture toggle on web.

Android equivalents:

- Start/Pause button.
- Reset button.
- Mode segmented control.
- Foreground service / notification timer for background behavior instead of browser PiP.
- Optional Android PiP if using Activity Picture-in-Picture.

### 9.2 Timer Duration Controls

Focus duration:

- Slider from 5 to 120 minutes, step 5.
- Custom numeric input accepted; normalized to nearest 5 and minimum 5.

Break duration:

- Short break and long break duration controls.
- Minimum 5, step 5.
- Long break default 15.

Quick presets:

- Current web has preset buttons in the sidebar/controls via `handleSetTimer`.

### 9.3 Goal Linking Banner

When `associatedGoalId` and `associatedGoalTitle` exist:

- Show active linked goal title.
- User can unlink.
- Timer completion/end completes linked goal through Ekagra completion API.

Unlink behavior:

- Clears local association only.
- Does not delete or alter the goal.
- A running server session may still need a pause/complete/delete action depending on current state.

### 9.4 Named Session Flow

When user starts timer without a task/goal:

- Prompt for a session title.
- `POST /api/ekagra-sessions/activate` with `sessionType: "named"`.
- Backend stores synthetic `goal_id = named:{sessionId}`.
- Completion writes analytics but does not complete a goal.

### 9.5 Task Sidebar

Task source:

- Authenticated users: tasks are represented as goals where `source === "ekagra"`.
- Unauthenticated fallback: local storage only.

Local storage keys:

- Authenticated user tasks fallback: `focus-tasks-{userId}`.
- Guest fallback: `focus-tasks`.

Task shape:

```ts
interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  completedAt: string | null;
  importedFromGoal?: boolean;
}
```

Authenticated add task:

- Calls `POST /api/goals` with:

```ts
{
  title: text;
  startedAt: new Date().toISOString();
  source: "ekagra";
}
```

Authenticated edit/delete/complete:

- Edit task text: `PATCH /api/goals/{id}` with `{ title }`.
- Delete task: `DELETE /api/goals/{id}`.
- Complete task: `PATCH /api/goals/{id}` with `{ completed: true, completedAt }`, unless the server Ekagra session completion handles it.

Legacy migration:

- If authenticated and no server Ekagra tasks exist but local tasks exist, web uploads local tasks to goals with `source: "ekagra"` and clears local storage.

### 9.6 Live Sessions Overlay

Entry points:

- Header "Sessions" button.
- Paused-session reminder.
- Sidebar panel.

Shows:

- Running Now: active session.
- Paused: paused sessions sorted by updated time.

Session actions:

- Pause active session: `PATCH /api/ekagra-sessions/{id}` with `status: "paused"`.
- Resume paused session: `PATCH /api/ekagra-sessions/{id}` with `status: "active"` and snapshot, or fallback to `POST /activate`.
- End session: `POST /api/ekagra-sessions/{id}/complete`.
- Delete session: `DELETE /api/ekagra-sessions/{id}`.
- Discard session: `POST /api/ekagra-sessions/{id}/discard`.

Paused reminder:

- If no active runtime session and there are paused sessions, web shows a reminder.
- Android equivalent can be a small banner/card on Ekagra screen.

### 9.7 History

The web "History" button opens task history/sidebar data and completed focus work.

For closed analytics history:

- Use `GET /api/ekagra-sessions/analytics`.
- Display `focusSessions` and/or `recentSessions`.

For open runtime session history:

- Use `GET /api/ekagra-sessions`.

### 9.8 Analytics Toggle

In `/study`, analytics can be shown inline with `showAnalytics`.

Triggers:

- `?view=analytics` sets analytics mode.
- Header analytics icon toggles analytics/timer.

Android:

- Use tab or separate screen.
- Refresh after completion.

### 9.9 Theme System

Current theme options:

```ts
[
  {
    id: "serene",
    name: "Serene",
    accent: "#1b8ec3ff",
    videoUrl: "https://del1.vultrobjects.com/qms-images/Safar/theme_2.mp4"
  },
  {
    id: "nostalgia",
    name: "Nostalgia",
    accent: "#1cbc31ff",
    videoUrl: "https://del1.vultrobjects.com/qms-images/Safar/theme_3.mp4"
  },
  {
    id: "amber",
    name: "Amber",
    accent: "#2e7144ff",
    videoUrl: "https://del1.vultrobjects.com/qms-images/Safar/theme_4.mp4"
  },
  {
    id: "solitude",
    name: "Solitude",
    accent: "#1c527cff",
    videoUrl: "https://del1.vultrobjects.com/qms-images/Safar/theme_1.mp4"
  }
]
```

Persistence:

```text
localStorage["focus-theme-id"]
```

Android equivalent:

- Store selected theme ID in DataStore/SharedPreferences.
- Cache or stream MP4 backgrounds.
- Use accent color for timer card, buttons, and progress.

### 9.10 Music System

Current tracks:

```ts
[
  {
    id: "serene-flow",
    name: "Serene Flow",
    url: "https://del1.vultrobjects.com/qms-images/Safar/music_1.mp3"
  },
  {
    id: "nostalgia-breeze",
    name: "Nostalgia Breeze",
    url: "https://del1.vultrobjects.com/qms-images/Safar/relaxingtime-sleep-music-vol16-195422.mp3"
  },
  {
    id: "amber-pulse",
    name: "Amber Pulse",
    url: "https://del1.vultrobjects.com/qms-images/Safar/WhatsApp_Audio_2026-02-18_at_10.05.04_AM.mpeg"
  },
  {
    id: "solitude-deep",
    name: "Solitude Deep",
    url: "https://del1.vultrobjects.com/qms-images/Safar/music_3.mp3"
  }
]
```

Persistence keys on web:

- `focus-music-track-id`: selected track ID.
- `focus_music_source`: selected track URL.
- `focus_music_muted`: `"1"` when muted.
- `focus_music_volume`: numeric string from `0` to `1`.
- `sessionStorage["focus_music_playing"]`: music playback state only within current browser session.

Behavior:

- Starting timer starts music.
- Pausing timer pauses music.
- Timer completion stops music and plays `/Notification.mp3` after 1 second.
- User can play/pause music manually.
- User can mute/unmute.
- User can change volume.

Android equivalent:

- Use `MediaPlayer`/ExoPlayer.
- Use audio focus handling.
- Store track, muted, and volume in DataStore.
- Avoid auto-playing on fresh cold start unless user explicitly resumes.

### 9.11 Picture-In-Picture / Background Timer

Web PiP:

- Uses a hidden video fed by a canvas stream.
- Draws timer, progress, mode, and linked goal to canvas.
- Uses `requestPictureInPicture`.
- Uses Media Session API for play/pause controls.
- Shows PiP nudge if timer runs and PiP is inactive.

Android equivalent:

- Use Android foreground service and notification actions for reliable background timer.
- Optional Activity PiP mode can show timer UI.
- Notification actions should map to Start/Pause and possibly Stop.
- Keep server snapshot paused on app background if you cannot guarantee runtime continuation.

## 10. Runtime Data Flow

### 10.1 Starting A Linked Goal Session

1. Goal screen opens Ekagra with `goalId` and `goalTitle`.
2. Ekagra stores association locally.
3. User presses Start.
4. Android calls:

```http
POST /api/ekagra-sessions/activate
```

Payload:

```ts
{
  goalId,
  goalTitle,
  source: "goal_continue",
  importedFromGoal: false,
  overrideActive: true,
  mode: "Timer",
  totalSeconds,
  remainingSeconds,
  isRunning: true,
  sessionStartedAt: new Date().toISOString()
}
```

5. Start local timer.
6. Store returned `session.id` as active runtime session ID.

### 10.2 Starting A Named Session

1. User taps Start with no linked goal/current task.
2. Show title prompt.
3. Call:

```ts
{
  sessionType: "named",
  sessionTitle: title,
  source: "manual",
  overrideActive: true,
  mode: "Timer",
  totalSeconds,
  remainingSeconds,
  isRunning: true,
  sessionStartedAt: new Date().toISOString()
}
```

4. Start timer.

### 10.3 Pausing

1. Stop local timer.
2. Call:

```http
PATCH /api/ekagra-sessions/{sessionId}
```

```ts
{
  status: "paused",
  mode: "Timer",
  totalSeconds,
  remainingSeconds,
  isRunning: false
}
```

3. Server increments `pause_count`.

### 10.4 Resuming

1. User selects paused session.
2. Apply session snapshot locally:
  - mode
  - totalSeconds
  - remainingSeconds
  - linked goal info if goal session
3. Call:

```ts
{
  status: "active",
  mode: "Timer",
  totalSeconds,
  remainingSeconds,
  isRunning: true,
  sessionStartedAt,
  goalTitle,
  source: "goal_continue" | "manual" | "imported",
  importedFromGoal
}
```

4. Start local timer.

### 10.5 Completing By End Button

Use live local timer values because server `remainingSeconds` can be stale if the user did not pause first.

```http
POST /api/ekagra-sessions/{sessionId}/complete
```

```ts
{
  mode: "Timer",
  elapsedSeconds: Math.max(0, totalSeconds - remainingSeconds),
  remainingSeconds,
  sessionStartedAt
}
```

Then:

- Clear runtime session ID.
- Refresh open sessions.
- Refresh Ekagra tasks from goals.
- Reset local timer.
- Clear associated goal if linked.

### 10.6 Completing By Timer Reaching Zero

When `remainingSeconds` reaches `0` from a positive value in `Timer` mode:

1. Call complete API with elapsed/snapshot.
2. Clear runtime session ID.
3. Refresh runtime sessions and tasks.
4. Reset timer.
5. Clear associated goal.

### 10.7 Reset Behavior

Named active runtime session:

- Web completes the named session with elapsed time before resetting.

Linked goal active runtime session:

- Reset clears local timer and association.
- If you implement reset while a linked server session is active, prefer either:
  - call `discard`, if reset means abandon, or
  - call `pause`, if reset means keep session.

The web currently has nuanced behavior; Android should make this UX explicit.

## 11. Server Analytics Write Path

Completing an Ekagra session calls `upsertFocusLogFromEkagraSession`.

Writes to `focus_sessions`:

```ts
{
  id,
  user_id,
  duration_minutes,
  actual_duration_minutes,
  planned_duration_minutes,
  break_minutes,
  completed: true,
  associated_goal_id,
  interrupted: false,
  started_at,
  completed_at,
  pause_count,
  task_title,
  session_type: "focus" | "short_break" | "long_break",
  timer_mode: "Timer" | "short" | "long",
  source_session_id,
  session_domain: "ekagra",
  created_at
}
```

Writes to `focus_session_logs`:

```ts
{
  id,
  user_id,
  duration_minutes,
  associated_goal_id,
  interrupted: false,
  completed: true,
  timestamp,
  date_key,
  created_at,
  pause_count,
  task_title,
  session_type,
  timer_mode,
  source_session_id,
  session_domain: "ekagra"
}
```

Deduplication:

- If a `focus_sessions` row already exists with the same `source_session_id`, the server returns that existing ID and does not insert duplicate logs.

Session type mapping:

- `mode === "Timer"` maps to analytics `focus`.
- `mode === "short"` maps to `short_break`.
- `mode === "long"` maps to `long_break`.

Minutes:

- Planned minutes = `totalSeconds / 60`.
- Actual elapsed minutes = `elapsedSeconds / 60`.
- For focus sessions, actual focus minutes go into `actual_duration_minutes`.
- For break sessions, elapsed minutes go into `break_minutes`.

## 12. Database Collections And Indexes

Primary runtime:

- `ekagra_mode_sessions`

Closed analytics:

- `focus_sessions`
- `focus_session_logs`

Linked goals:

- `goals`

Important indexes:

- `ekagra_mode_sessions`: `{ user_id: 1, status: 1, updated_at: -1 }`
- `ekagra_mode_sessions`: `{ user_id: 1, goal_id: 1, status: 1, updated_at: -1 }`
- `ekagra_open_session_per_goal_unique`: unique `{ user_id: 1, goal_id: 1 }` for statuses `active` and `paused`
- `ekagra_mode_sessions`: unique `{ user_id: 1, id: 1 }`
- `focus_sessions`: `{ user_id: 1, completed_at: -1 }`
- `focus_sessions_completed_partial`: partial index for completed sessions
- `focus_session_logs`: `{ user_id: 1, timestamp: -1 }`
- `focus_session_logs`: `{ user_id: 1, date_key: 1 }`

## 13. Client-Side Caching And Polling

Web data cache:

- Open sessions cache TTL: 30 seconds.
- Active session cache TTL: 30 seconds.
- Analytics cache TTL: 60 seconds.
- Writes invalidate all Ekagra read caches.

Web polling:

- Ekagra screen refreshes runtime sessions every 20 seconds while visible.
- Analytics screen refreshes every 5 minutes while visible.
- Runtime sync hook sends active snapshot every 15 seconds while running.
- Runtime sync hook sends a debounced paused snapshot 800ms after changes while paused.
- Runtime sync hook freezes session as paused on page hide/unload.

Android recommendations:

- Refresh open sessions on screen open/resume.
- Poll while screen is visible if multi-device consistency matters.
- Send session snapshot when app goes background.
- Use WorkManager/foreground service only for active timer reliability, not for frequent network writes unless necessary.

## 14. Local Persistence Keys On Web

These are web-specific but useful for Android parity:

- `focus-theme-id`
- `focus-music-track-id`
- `focus_music_source`
- `focus_music_muted`
- `focus_music_volume`
- `focus_music_playing` in sessionStorage
- `focus-tasks`
- `focus-tasks-{userId}`
- `focus_timer_session_snapshot_v1` exists but current web clears it aggressively and `hasPendingResume` is false.

Android should use DataStore/Room equivalents:

- Selected theme ID.
- Selected music track ID/URL.
- Mute state.
- Volume.
- Local draft task list only for guest/offline fallback.
- Active timer snapshot if implementing offline/background resilience.

## 15. Error Cases To Handle

Ekagra APIs:

- `400 sessionTitle is required for named sessions`
- `400 goalId is required`
- `400 Invalid status`
- `400 Nothing to update`
- `404 Goal not found or unauthorized`
- `404 Ekagra session not found`
- `409 Completed or archived goals cannot be focused in Ekagra`
- `409 ACTIVE_SESSION_CONFLICT`
- `500 Failed to fetch/activate/update/complete/discard/delete Ekagra session`

Android UX recommendations:

- On `ACTIVE_SESSION_CONFLICT`, show current active session and ask whether to switch/pause it.
- On completed/archived goal conflict, refresh goals and clear linked goal.
- On network failure during pause/background, keep local timer state and retry when foregrounded.
- On failure to complete, do not mark goal done locally until server confirms.
- On stale session not found, clear runtime session ID and refresh open sessions.

## 16. Android Native Implementation Checklist

Minimum screens/components:

- Ekagra Timer screen.
- Timer card with mode selector, countdown, start/pause, reset.
- Duration controls and custom duration input.
- Linked goal banner with unlink.
- Named session prompt.
- Task sidebar/list.
- Live sessions overlay/sheet.
- Theme selector.
- Music selector and playback controls.
- Analytics screen with overview and session history.
- Paused session reminder.

Minimum repositories:

- `EkagraSessionRepository`
  - list open sessions
  - get active session
  - activate
  - patch snapshot/status
  - complete
  - discard
  - delete
  - analytics
- `GoalRepository`
  - get goals
  - add source=`ekagra` task
  - update goal title
  - complete goal
  - delete goal
- `AuthRepository`
  - access token and refresh handling.

Recommended native services:

- `FocusTimerService`: foreground service for active countdown and notification controls.
- `MusicPlaybackController`: ExoPlayer/MediaPlayer wrapper.
- `EkagraSyncManager`: background/foreground snapshot syncing.
- `IstDateUtils`: IST day-key utilities.

Parity-critical details:

- Use live local timer values when completing a session.
- Do not rely on server `remainingSeconds` during active countdown unless you just synced it.
- Completing linked Timer session completes the goal.
- Completing named session only logs analytics.
- Open sessions live in `ekagra_mode_sessions`; completed history lives in `focus_sessions`.
- `GET /api/ekagra-sessions` will not return completed sessions.
- Analytics should come from `GET /api/ekagra-sessions/analytics`.

## 17. Current Web Source References

- `client/pages/StudyWithMe.tsx`
- `client/pages/FocusAnalytics.tsx`
- `client/contexts/FocusContext.tsx`
- `client/components/focus/TimerCard.tsx`
- `client/components/focus/sidebar/SessionOverlay.tsx`
- `client/components/focus/sidebar/EkagraSessionsPanel.tsx`
- `client/hooks/useEkagraTimerSync.ts`
- `client/services/ekagraSessionService.ts`
- `client/services/ekagraAnalyticsService.ts`
- `client/utils/dataService.ts`
- `shared/api.ts`
- `server/routes/ekagra-sessions.ts`
- `server/routes/focus-sessions.ts`
- `server/routes/goals.ts`
- `server/db.ts`
