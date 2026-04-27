# Goal Section Android Native Implementation Spec

Source scope:

- Web route: `/goals`
- Client page: `client/pages/Goals.tsx`
- Client API layer: `client/utils/dataService.ts`
- Shared types: `shared/api.ts`
- Server route: `server/routes/goals.ts`
- Related analytics source: `server/routes/ekagra-sessions.ts`
- Database collections: `goals`, `goal_activity_logs`, `focus_sessions`, `focus_session_logs`, `streaks`

This document is for rebuilding the website Goal section as an Android native frontend. It lists the current features, backend APIs, data contracts, linked Ekagra behavior, analytics, and important edge cases.

## 1. Authentication And Base API Rules

All Goal section APIs are protected.

Base URL:

```text
{API_BASE}/api
```

Current web default:

```text
VITE_API_URL || /api
```

Auth mechanism:

- Every request uses `credentials: include` on web.
- Requests also include `Authorization: Bearer {accessToken}` when an access token exists.
- On `401`, `apiFetch` calls `POST /api/auth/refresh`, stores the returned `accessToken`, and retries once.
- Refresh token is stored server-side/browser-cookie style on web. Native Android should preserve equivalent cookie handling or implement the same refresh-token flow with an HTTP client cookie jar.

Required headers for JSON APIs:

```http
Content-Type: application/json
Authorization: Bearer <accessToken>
Cookie: <refresh/session cookies if backend expects them>
```

Server protections:

- `requireAuth` is required for all `/api/goals/*` APIs.
- `/api/` has rate limiting: 100 requests per minute per IP.
- CSRF is currently disabled in `server/index.ts`.

## 2. Routes And Screens

Goal section route:

```text
/goals
```

Route protection:

- If unauthenticated, website redirects to `/?signin=true`.
- Android should block the screen behind logged-in state and redirect to login/session restore.

Main tabs in the Goal section:

- `Goals`: active goals for today, scheduled tasks, recent completed goals.
- `History`: completed goals filtered by a selected date.
- `Analytics`: goal completion analytics, manual studied time, and linked Ekagra focus time summaries.

Important UI modals:

- `GoalModal`: create/edit goal.
- `StudyDurationModal`: shown when manually marking a goal as done; asks how many minutes were studied.
- `Goals Guide`: local informational modal.

## 3. Goal Data Model

Shared interface: `Goal` in `shared/api.ts`.

Canonical client shape:

```ts
type GoalKind = "one_time" | "today" | "repeat" | "scheduled";
type GoalUnitType = "binary" | "count" | "duration_minutes" | "checklist";
type GoalExecutionMode = "manual" | "timed" | "hybrid";
type GoalExecutionStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "partial"
  | "missed"
  | "cancelled"
  | "expired"
  | "rolled_over";
type GoalCarryForwardMode = "none" | "remaining" | "full" | "ask";

interface GoalSubtask {
  id: string;
  text: string;
  done: boolean;
}

interface Goal {
  id: string;
  userId: string;
  text: string;
  title?: string;
  description?: string | null;
  source?: "manual" | "ekagra";
  importedFromGoal?: boolean;
  completedViaFocus?: boolean;
  goalKind?: GoalKind;
  unitType?: GoalUnitType;
  executionMode?: GoalExecutionMode;
  linkedFocusEnabled?: boolean;
  plannedFocusMinutes?: number | null;
  targetValue?: number | null;
  achievedValue?: number;
  status?: GoalExecutionStatus;
  carryForwardMode?: GoalCarryForwardMode;
  type: "daily" | "weekly";
  completed: boolean;
  createdAt: string;
  completedAt?: string | null;
  studiedMinutes?: number | null;
  startedAt?: string | null;
  expiresAt?: string | null;
  lifecycleStatus?: "active" | "missed" | "rolled_over" | "abandoned";
  rollover_prompt_pending?: boolean;
  source_goal_id?: string | null;
  scheduledDate?: string | null;
  category?: "academic" | "health" | "personal" | "other";
  priority?: "high" | "medium" | "low";
  subtasks?: GoalSubtask[];
}
```

Backend also returns snake_case aliases for many fields:

- `created_at`
- `completed_at`
- `studied_minutes`
- `expires_at`
- `lifecycle_status`
- `scheduled_date`
- `imported_from_goal`
- `completed_via_focus`
- `goal_kind`
- `unit_type`
- `execution_mode`
- `linked_focus_enabled`
- `planned_focus_minutes`
- `target_value`
- `achieved_value`
- `status_value`
- `carry_forward_mode`

Android should normalize both camelCase and snake_case to a single local model.

## 4. Goal Options And Meaning

Goal type options used by the current UI:

- `today`: active today.
- `scheduled`: dormant until scheduled date.
- `one_time`: legacy option, shown only when editing old one-time goals.
- `repeat`: supported by shared/server utilities but mostly not exposed in the current create UI.

Tracking method options currently exposed:

- `binary`: "Done / Not done".
- `duration_minutes`: "Track by focused time"; enables/plans linked Ekagra focus sessions.

Other unit types supported by shared/server helpers:

- `count`
- `checklist`

Carry-forward modes:

- `none`: end for this day.
- `remaining`: carry remaining to next day.
- `full`: repeat full target next day.
- `ask`: prompt next day.

Execution statuses:

- `not_started`
- `in_progress`
- `partial`
- `completed`
- `missed`
- `cancelled`
- `expired`
- `rolled_over`

Source values:

- `manual`: standard Goal section goal.
- `ekagra`: task created from Ekagra Mode.

Important display badges:

- `Ekagra mode task`: shown when `source === "ekagra"`.
- `Timer linked`: shown when `linkedFocusEnabled === true`.
- Type badge: Today / Scheduled / Repeat / One-time.
- Unit badge: Done/Not done / Time / Count / Checklist.
- Status badge: In progress / Partial / Missed / Cancelled / Completed.

## 5. Date And Time Rules

The Goal section uses IST date keys heavily.

Date key format:

```text
YYYY-MM-DD
```

Server timezone logic:

- IST offset is `+05:30`.
- `scheduledDate` is parsed into an IST date key.
- Stored `scheduled_date` is a `Date` at `YYYY-MM-DDT00:00:00.000Z` based on that key.
- Expiry is calculated at end of the target IST day for daily goals.

Create/update scheduling constraints:

- Cannot schedule goals in the past.
- Cannot schedule goals more than 7 days ahead.
- Goals can be created at any time.

Android implementation:

- Use IST date keys for day grouping, history filters, and scheduled/dormant logic.
- If the user device timezone differs, still compute Goal section day logic using IST unless the backend changes.

## 6. Goal API Endpoints

### 6.1 Get All Goals

```http
GET /api/goals
```

Behavior:

- Migrates legacy Ekagra tasks from old `focus_tasks`.
- Restores previously transferred manual goals.
- Syncs expired goals to missed.
- Returns all user goals sorted by `created_at desc`.

Response:

```ts
Goal[]
```

Android usage:

- Load on screen open.
- Refresh after create/edit/delete/complete.
- Normalize `title = title || text || ""`.

### 6.2 Create Goal

```http
POST /api/goals
Content-Type: application/json
```

Client payload sent by `dataService.addGoal`:

```ts
{
  text: string;
  title: string;
  description?: string;
  subtasks?: GoalSubtask[];
  type: "daily";
  scheduledDate?: string;
  startedAt?: string | null;
  source?: "manual" | "ekagra";
  goalKind?: GoalKind;
  unitType?: GoalUnitType;
  executionMode?: GoalExecutionMode;
  linkedFocusEnabled?: boolean;
  plannedFocusMinutes?: number | null;
  targetValue?: number | null;
  achievedValue?: number;
  status?: GoalExecutionStatus;
  carryForwardMode?: GoalCarryForwardMode;
}
```

Server defaults:

- `type`: always `daily`.
- `category`: `other`.
- `priority`: `medium`.
- `source`: `manual`.
- `goalKind`: `today`.
- `unitType`: `binary`.
- `executionMode`: `timed` if `unitType === "duration_minutes"`, otherwise `manual`.
- `linkedFocusEnabled`: true if `unitType === "duration_minutes"`, otherwise false, unless explicitly provided.
- `plannedFocusMinutes`: target value for duration goals if not explicitly provided.
- `status`: `not_started`.
- `carryForwardMode`: `ask` for repeat goals, otherwise `none`.
- `completed`: true only if status is `completed`.
- `achievedValue`: `1` for completed binary goals, otherwise `0` when absent.

Validation:

- Title is required.
- Invalid scheduled date returns `400`.
- Past scheduled date returns `400`.
- More than 7 days ahead returns `400`.

Response:

```ts
Goal
```

### 6.3 Update Goal

```http
PATCH /api/goals/{goalId}
Content-Type: application/json
```

Used for:

- Mark done.
- Edit title/description/subtasks/options.
- Reschedule.
- Update start time.
- Update manual studied minutes.

Supported body fields:

```ts
{
  completed?: boolean;
  completedAt?: string;
  studiedMinutes?: number;
  title?: string;
  text?: string;
  description?: string | null;
  scheduledDate?: string;
  category?: "academic" | "health" | "personal" | "other";
  priority?: "high" | "medium" | "low";
  subtasks?: GoalSubtask[];
  type?: "daily" | "weekly";
  startedAt?: string | null;
  goalKind?: GoalKind;
  unitType?: GoalUnitType;
  executionMode?: GoalExecutionMode;
  linkedFocusEnabled?: boolean;
  plannedFocusMinutes?: number | null;
  targetValue?: number | null;
  achievedValue?: number;
  status?: GoalExecutionStatus;
  carryForwardMode?: GoalCarryForwardMode;
}
```

Completion behavior:

- Manual completion from the Goal screen calls `PATCH /api/goals/{id}` with `{ completed: true, completedAt, studiedMinutes }`.
- When completed manually:
  - `completed = true`
  - `completed_at = completedAt or now`
  - `completed_via_focus = false`
  - `status_value = completed`
  - `achieved_value` is set to target when target exists, or `1` for binary goals.
  - Goal completion streak may update.

Status update behavior:

- Setting `status: "completed"` also marks the goal complete.
- Setting a non-completed status on a completed goal clears `completed` and `completed_at`.

Schedule update behavior:

- Same scheduling limits as create.
- Updates `scheduled_date`.
- Recalculates `expires_at`.

Response:

```ts
{ message: "Goal updated", completed?: boolean, completedAt?: string }
```

### 6.4 Delete Goal

```http
DELETE /api/goals/{goalId}
```

Behavior:

- Deletes the user-owned goal.
- If the goal was not completed, logs an `ABANDONED` event in `goal_activity_logs`.

Response:

```ts
{ message: "Goal deleted" }
```

### 6.5 Repeat Single Goal

Current web page mostly repeats by creating a new goal via `POST /api/goals`, but the backend also supports:

```http
POST /api/goals/{goalId}/repeat
Content-Type: application/json
```

Payload:

```ts
{
  scheduledDate: string;
}
```

Behavior:

- Clones the source goal for the specified date.
- New goal is daily, incomplete, active, with `source_goal_id` set to the original goal.
- Copies type/unit/linking/planned focus settings.

Response:

```ts
Goal
```

### 6.6 Get Previous Goals

```http
GET /api/goals/previous-goals?period=daily|weekly|monthly|custom&days={number}
```

Behavior:

- Returns goals scheduled/created in a previous time range.
- Used for repeat-plan style flows.

Response:

```ts
Goal[]
```

### 6.7 Repeat Plan

```http
POST /api/goals/repeat-plan
Content-Type: application/json
```

Payload:

```ts
{
  goalIds: string[];
}
```

Validation:

- At least one goal ID.
- Maximum 50 goals.

Behavior:

- Clones selected goals for today.
- Resets completion/progress.
- Preserves source, subtasks, goal kind, unit, execution mode, focus link, target, and carry-forward mode.

Response:

```ts
{
  message: string;
  goals: Goal[];
}
```

### 6.8 Get Rollover Prompts

```http
GET /api/goals/rollover-prompts
```

Behavior:

- Returns missed goals from yesterday that have `rollover_prompt_pending = true`.
- Stale prompts are cleared.

Response:

```ts
Goal[]
```

### 6.9 Respond To Rollover Prompt

```http
POST /api/goals/{goalId}/rollover-action
Content-Type: application/json
```

Payload:

```ts
{
  action: "retry" | "archive";
}
```

Retry behavior:

- Clones the missed goal for today.
- Marks old goal as `rolled_over`.
- Logs `ROLLED_OVER` for old goal and `CREATED` for new goal.

Archive behavior:

- Marks old goal as `abandoned`.
- Logs `ABANDONED`.

Response for retry:

```ts
{
  message: "Goal rolled over for today";
  goal: Goal;
}
```

Response for archive:

```ts
{
  message: "Goal archived as abandoned";
}
```

### 6.10 Goal Focus Summary

```http
POST /api/goals/focus-summary
Content-Type: application/json
```

Payload:

```ts
{
  goalIds: string[];
  dayKey?: string; // YYYY-MM-DD
}
```

Behavior:

- Verifies all requested IDs belong to the authenticated user.
- Aggregates focus time from `focus_sessions`.
- Returns all-time and optional day-level summary.

Response:

```ts
{
  allTime: Record<string, { totalMinutes: number; sessionCount: number }>;
  forDay: Record<string, { totalMinutes: number; sessionCount: number }>;
}
```

### 6.11 Transfer/Revert Legacy Ekagra Import APIs

These exist on the backend, though the current Goal page navigates directly to `/study?goalId=...`.

```http
POST /api/goals/{goalId}/transfer-to-ekagra
```

Behavior:

- Validates the goal exists and is not completed/archived.
- Does not move the goal. Returns "ready for Ekagra focus".

Response:

```ts
{
  message: "Goal ready for Ekagra focus";
  goal: Goal;
}
```

```http
POST /api/goals/{goalId}/revert-from-ekagra-import
```

Behavior:

- If a goal is `source = ekagra` and `imported_from_goal = true`, reverts it to `source = manual`.
- Completed imported goals cannot be reverted.

Response:

```ts
{
  message: string;
  goal: Goal;
}
```

## 7. Goal To Ekagra Linking

Goal card action:

```ts
navigate(`/study?goalId=${goal.id}&goalTitle=${goalTitle}`)
```

Android equivalent:

- Open Ekagra screen.
- Pass `goalId` and `goalTitle` as navigation args/deep-link parameters.
- Ekagra screen should set its active associated goal from those args.

Important rule:

- Goals stay in the Goals domain.
- Ekagra sessions link to goals by `goalId`.
- Ending a linked Ekagra Timer session marks the linked goal complete through the Ekagra completion API.

Goal constraints for focusing:

- Completed goals cannot be focused.
- Archived goals (`abandoned` or `rolled_over`) cannot be focused.
- Backend returns `409` if the goal is completed or archived.

## 8. Goal Screen Feature Inventory

### 8.1 Goals Tab

Shows:

- Pending active goals for today.
- Dormant scheduled goals in a collapsible scheduled section.
- Recent completed goals, capped at 5.

Active goal definition:

- `source !== "ekagra"`
- Not completed.
- Not scheduled dormant.

Dormant scheduled definition:

- `goalKind === "scheduled"`
- `scheduledDate > todayKey`
- Not completed.

Goal card displays:

- Type badge.
- Unit badge.
- Status badge if relevant.
- Ekagra mode task badge if `source === "ekagra"`.
- Timer linked badge if `linkedFocusEnabled`.
- Title.
- Description.
- Progress percent for non-binary goals.
- Progress bar for checklist/duration/count.
- Due/completed metadata.
- Studied minutes if completed and `studiedMinutes > 0`.

Goal card actions:

- Start Focus: navigate to Ekagra with goal ID/title.
- Edit: open `GoalModal`.
- Repeat: create a new copy for today.
- Delete.
- Mark Done: open `StudyDurationModal`.

### 8.2 Create/Edit Goal Modal

Fields:

- Title.
- Description.
- Goal type: Today or Schedule Task.
- Scheduled date if scheduled.
- Tracking method: Done / Not done or Track by focused time.
- Enable linked focus sessions.
- Planned focus minutes / target value for duration goals.
- Start time in IST.
- Execution status for editing.
- Carry-forward behavior.
- Subtasks support exists in the data model.

Current exposed options are narrower than server support. Android should preserve server-compatible fields even if the first UI version exposes only the current web fields.

### 8.3 Manual Completion Flow

When user taps done:

1. Show duration prompt.
2. Ask "How much time did you study?"
3. User can enter minutes or skip.
4. Call `PATCH /api/goals/{id}` with:

```ts
{
  completed: true;
  completedAt: new Date().toISOString();
  studiedMinutes: number;
}
```

Local optimistic update:

- Set `completed = true`.
- Set `completedAt = now`.
- Set `studiedMinutes`.
- Re-fetch on error.

### 8.4 History Tab

Shows completed goals by selected date.

Date source:

- If completed, use `completedAt`.
- Otherwise use scheduled/created anchor date.

Sort:

- Most recent completion/creation first.

Controls:

- Date picker.
- Reset to today.

### 8.5 Analytics Tab

Goal analytics intentionally focuses on completion/progress, not pure timer analytics.

Metrics calculated client-side:

- Manual goals count.
- Manual completed goals count.
- Manual completion rate.
- Average progress percent.
- Completed last 7 days.
- Consistency days over last 7 days.
- Study time today = manual studied minutes today + linked Ekagra focus minutes today.
- Total manual studied minutes.
- Total linked Ekagra focus minutes.
- Average studied minutes per manually completed goal.
- Goal kind breakdown.
- Goal unit breakdown.
- Status breakdown.
- Seven-day series:
  - total goals for day
  - completed goals for day
  - average progress for day

External data dependency:

- Calls `GET /api/ekagra-sessions/analytics` through `ekagraAnalyticsService.getEkagraAnalytics()`.
- Uses `stats.focusSessions`.
- Goal section counts only sessions with `associatedGoalId`.

Manual studied minutes source:

- `Goal.studiedMinutes` / `studied_minutes`.

Ekagra linked focus minutes source:

- `EkagraAnalyticsFocusSession.actualMinutes` where `associatedGoalId` exists.

Charts:

- `StreaksConsistencyChart`: completion trend last 7 days.
- `StudyTimeDonutChart`: study-time breakdown where used.

## 9. Server-Side Lifecycle And Activity Logs

Goal lifecycle values:

- `active`
- `missed`
- `rolled_over`
- `abandoned`

Activity log event values:

- `CREATED`
- `COMPLETED`
- `ABANDONED`
- `ROLLED_OVER`

The server logs:

- `CREATED` on create/repeat/rollover retry/repeat plan.
- `COMPLETED` when a goal is newly completed.
- `ABANDONED` on delete of incomplete goal or archive rollover action.
- `ROLLED_OVER` on retry rollover action.

Goal streak:

- Updated when a goal is completed and it is the first completion for that IST day.
- Stored in `streaks.goal_completion_streak`, `last_goal_completion_date`, and `last_active_date`.

Expired goal sync:

- `GET /api/goals`, `GET /api/goals/rollover-prompts`, and some updates call `syncExpiredGoalsToMissed`.
- Missed goals can trigger rollover prompt when eligible.

## 10. Database Collections

Primary:

- `goals`
- `goal_activity_logs`

Linked analytics:

- `focus_sessions`
- `focus_session_logs`

Streaks:

- `streaks`

Legacy migration:

- Old Ekagra tasks came from `focus_tasks`; server migrates them into `goals` with `source: "ekagra"`.

Important indexes from `server/db.ts`:

- `goals`: `{ user_id: 1, created_at: -1 }`
- `goals`: `{ user_id: 1, lifecycle_status: 1, expires_at: 1 }`
- `goal_activity_logs`: `{ user_id: 1, timestamp: -1 }`
- `goal_activity_logs`: `{ user_id: 1, event_type: 1, timestamp: -1 }`
- `goal_activity_logs`: `{ goal_id: 1, timestamp: -1 }`
- `focus_sessions`: `{ user_id: 1, completed_at: -1 }`
- `focus_sessions_completed_partial`: partial index for completed focus sessions.

## 11. Android Native Implementation Checklist

Minimum native screens/components:

- Goal list screen with tabs: Goals, History, Analytics.
- Create/edit goal form.
- Study duration completion dialog.
- Scheduled tasks collapsible section.
- Goal card with badges, progress, actions.
- History date filter.
- Analytics summary and charts.
- Ekagra deep-link navigation from goal card.

Required native network calls:

- `GET /api/goals`
- `POST /api/goals`
- `PATCH /api/goals/{id}`
- `DELETE /api/goals/{id}`
- `POST /api/goals/{id}/repeat` or clone via `POST /api/goals`
- `GET /api/goals/rollover-prompts`
- `POST /api/goals/{id}/rollover-action`
- `POST /api/goals/focus-summary`
- `GET /api/ekagra-sessions/analytics`

Recommended local architecture:

- `GoalRepository`: owns network calls and model normalization.
- `GoalViewModel`: owns tab state, todayKey, historyDateFilter, derived lists/metrics.
- `GoalFormState`: mirrors create/edit modal state.
- `GoalAnalyticsMapper`: derives analytics from goals plus Ekagra analytics.
- `IstDateUtils`: shared date-key utilities.

Important parity rules:

- Normalize snake_case and camelCase.
- Treat `title || text` as display title.
- Exclude `source === "ekagra"` from standard manual goals.
- Do not move a goal when starting Ekagra; pass ID/title and link by session.
- Keep manual studied minutes separate from Ekagra timer minutes.
- Scheduled future goals stay dormant until their IST scheduled date.
- Respect the 7-day scheduling limit unless backend changes.

## 12. Error Cases To Handle

Common API errors:

- `400 Title is required`
- `400 Invalid scheduled date`
- `400 Cannot schedule goals in the past`
- `400 Cannot schedule goals more than 7 days ahead`
- `400 Invalid goal type/status/unit/etc.`
- `404 Goal not found or unauthorized`
- `409 Completed or archived goals cannot be transferred/focused`
- `500 Internal server error`

Android UX recommendations:

- Re-fetch goals after failed optimistic updates.
- Show field-level scheduling errors.
- If Ekagra focus activation fails due to completed/archived goal, refresh goals and remove start-focus affordance.
- Keep create/edit form values locally until a successful save.

## 13. Current Web Source References

- `client/pages/Goals.tsx`
- `client/utils/goalUtils.ts`
- `client/utils/dataService.ts`
- `client/services/ekagraAnalyticsService.ts`
- `shared/api.ts`
- `server/routes/goals.ts`
- `server/routes/ekagra-sessions.ts`
- `server/routes/focus-sessions.ts`
- `server/db.ts`
