# SAFAR Platform — REST API Documentation
> **For Android App Development**  
> Base URL: `https://<your-domain>/api`  
> All timestamps are UTC ISO-8601. All dates for Indian users are computed in IST (UTC+5:30).

---

## 📋 Table of Contents

1. [Authentication & Tokens](#1-authentication--tokens)
2. [User Profile](#2-user-profile)
3. [Goals](#3-goals)
4. [Focus Sessions (Ekagra Mode)](#4-focus-sessions-ekagra-mode)
5. [Moods / Daily Check-In](#5-moods--daily-check-in)
6. [Journal](#6-journal)
7. [Streaks](#7-streaks)
8. [Analytics](#8-analytics)
9. [Achievements](#9-achievements)
10. [Suggestions](#10-suggestions)
11. [File Uploads](#11-file-uploads)
12. [Mehfil (Community)](#12-mehfil-community)
13. [Study Planner](#13-study-planner)
14. [Error Codes](#14-error-codes)
15. [Rate Limiting](#15-rate-limiting)
16. [Payments](#16-payments)
17. [Focus Overlay (Web)](#17-focus-overlay-web)
18. [Ekagra Sessions (Timer State)](#18-ekagra-sessions-timer-state)
19. [Mission (MVP)](#19-mission-mvp)
20. [System / Health & Debug](#20-system--health--debug)

---

## Authentication Overview

SAFAR uses a **JWT Bearer Token** system:

- **Access Token** — Short-lived JWT returned in response body. Send as `Authorization: Bearer <token>` header.
- **Refresh Token** — Long-lived JWT (30 days) stored in an `HttpOnly` cookie named `rt` (production: `__Host-rt`).

> **Android Note:** For cookie-based refresh tokens, use `CookieManager` or `OkHttp`'s `CookieJar`. Store the access token securely in Android Keystore / EncryptedSharedPreferences.

---

## 1. Authentication & Tokens

### 1.1 Sign Up
```
POST /api/auth/signup
```
**Body:**
```json
{
  "name": "Arjun Kumar",
  "email": "arjun@gmail.com",
  "password": "securepass123",
  "examType": "UPSC",
  "preparationStage": "beginner",
  "gender": "male",
  "profileImage": "https://..." 
}
```
> `email` — only Gmail and Outlook domains allowed  
> `profileImage` — optional; must be an `https://` URL or `/uploads/` path (no base64)

**Response `201`:**
```json
{
  "accessToken": "eyJhbGci...",
  "user": {
    "id": "uuid",
    "name": "Arjun Kumar",
    "email": "arjun@gmail.com",
    "avatar": "https://...",
    "examType": "UPSC",
    "preparationStage": "beginner",
    "gender": "male"
  }
}
```
**Errors:** `400` missing fields / invalid email / disallowed domain, `409` email already in use

---

### 1.2 Login
```
POST /api/auth/login
```
**Body:**
```json
{
  "email": "arjun@gmail.com",
  "password": "securepass123"
}
```
**Response `200`:**
```json
{
  "accessToken": "eyJhbGci...",
  "user": {
    "id": "uuid",
    "name": "Arjun Kumar",
    "email": "arjun@gmail.com",
    "avatar": "https://...",
    "examType": "UPSC",
    "preparationStage": "beginner",
    "gender": "male",
    "isAdmin": false
  }
}
```
Sets `rt` cookie (HttpOnly, 30-day).  
**Errors:** `400` missing credentials, `401` invalid credentials

---

### 1.3 Refresh Access Token
```
POST /api/auth/refresh
```
> Requires `rt` cookie (sent automatically by browser/CookieJar).  
> No request body needed.

**Response `200`:**
```json
{
  "accessToken": "eyJhbGci..."
}
```
Rotates the refresh token automatically (new `rt` cookie set).  
**Errors:** `401` no/invalid refresh token, `409` stale (reused) refresh token

---

### 1.4 Logout
```
POST /api/auth/logout
Authorization: Bearer <access_token>
```
Revokes all tokens in the current token family. Clears the `rt` cookie.

**Response `200`:**
```json
{ "ok": true }
```

---

### 1.5 Forgot Password
```
POST /api/auth/forgot-password
```
**Body:**
```json
{ "email": "arjun@gmail.com" }
```
Sends a password reset email. Rate limited to 5 requests per 15 minutes per IP.

**Response `200`:**
```json
{ "message": "Reset link sent. Please check your email inbox." }
```
**Errors:** `400` invalid email, `404` email not registered, `429` rate limited, `503` email service unavailable

---

### 1.6 Confirm Password Reset
```
POST /api/auth/reset-password/confirm
```
**Body:**
```json
{
  "token": "<reset_token_from_email_link>",
  "newPassword": "newpassword123"
}
```
> Password must be at least 8 characters.

**Response `200`:**
```json
{ "message": "Password reset successfully" }
```
**Errors:** `400` missing fields / weak password / invalid or expired token

---

## 2. User Profile

### 2.1 Get Current User
```
GET /api/auth/me
Authorization: Bearer <access_token>
```
Also updates login streak and logs daily activity.

**Response `200`:**
```json
{
  "user": {
    "id": "uuid",
    "name": "Arjun Kumar",
    "email": "arjun@gmail.com",
    "avatar": "https://...",
    "examType": "UPSC",
    "preparationStage": "beginner",
    "gender": "male"
  },
  "streaks": {
    "loginStreak": 7,
    "checkInStreak": 5,
    "goalCompletionStreak": 3,
    "lastActiveDate": "2026-04-01T12:00:00.000Z"
  }
}
```

---

### 2.2 Get Login History
```
GET /api/auth/login-history?limit=90
Authorization: Bearer <access_token>
```
| Query Param | Type | Default | Max |
|---|---|---|---|
| `limit` | integer | 90 | 365 |

**Response `200`:**
```json
[
  { "timestamp": "2026-04-01T06:30:00.000Z" },
  { "timestamp": "2026-03-31T07:15:00.000Z" }
]
```

---

### 2.3 Update Profile
```
PATCH /api/auth/profile
Authorization: Bearer <access_token>
```
**Body (all fields optional):**
```json
{
  "name": "Arjun K.",
  "examType": "UPSC",
  "preparationStage": "advanced",
  "gender": "male",
  "avatar": "/uploads/avatars/abc123.webp"
}
```
> `avatar` can be:
> - A hosted URL (`https://...`) or an uploaded path (`/uploads/...`)
> - `null` / empty string to clear the avatar

**Response `200`:**
```json
{
  "id": "uuid",
  "name": "Arjun K.",
  "email": "arjun@gmail.com",
  "avatar": "/uploads/avatars/abc123.webp",
  "examType": "UPSC",
  "preparationStage": "advanced",
  "gender": "male"
}
```
**Errors:** `400` no fields to update / invalid avatar URL, `401` unauthorized

---

### 2.4 Deprecated Endpoints (410 Gone)
```
POST /api/auth/check-email
POST /api/auth/reset-password
```
Both endpoints return `410 Gone` with a message pointing to:
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password/confirm`

---

## 3. Goals

> Base path: `/api/goals`  
> All routes require `Authorization: Bearer <access_token>`

### Goal Object Schema
```json
{
  "id": "uuid",
  "title": "Revise History Chapter 5",
  "description": "Focus on Mughal Empire section",
  "text": "Revise History Chapter 5",
  "type": "daily",
  "completed": false,
  "category": "academic",
  "priority": "high",
  "source": "manual",
  "goalKind": "today",
  "unitType": "binary",
  "executionMode": "manual",
  "linkedFocusEnabled": false,
  "plannedFocusMinutes": null,
  "targetValue": null,
  "achievedValue": 0,
  "status": "not_started",
  "carryForwardMode": "none",
  "importedFromGoal": false,
  "completedViaFocus": false,
  "studiedMinutes": 0,
  "subtasks": [
    { "id": "uuid", "text": "Read pages 50-70", "done": false }
  ],
  "createdAt": "2026-04-01T05:30:00.000Z",
  "completedAt": null,
  "startedAt": null,
  "expiresAt": "2026-04-01T18:29:59.000Z",
  "scheduledDate": "2026-04-01",
  "lifecycleStatus": "active"
}
```
**`lifecycleStatus` values:** `active` | `missed` | `rolled_over` | `abandoned`  
**`category` values:** `academic` | `health` | `personal` | `other`  
**`priority` values:** `high` | `medium` | `low`  
**`source` values:** `manual` | `ekagra` (auto-created from focus sessions)  
**`goalKind` values:** `one_time` | `today` | `repeat` | `scheduled`  
**`unitType` values:** `binary` | `count` | `duration_minutes` | `checklist`  
**`executionMode` values:** `manual` | `timed` | `hybrid`  
**`status` values:** `not_started` | `in_progress` | `completed` | `partial` | `missed` | `cancelled` | `expired` | `rolled_over`  
**`carryForwardMode` values:** `none` | `remaining` | `full` | `ask`  
**`scheduledDate` format:** `YYYY-MM-DD` (IST date key)

---

### 3.1 Get All Goals
```
GET /api/goals
```
Returns all goals for the current user. Automatically migrates legacy tasks and marks expired goals as `missed`.

**Response `200`:** `GoalObject[]`

---

### 3.2 Create Goal
```
POST /api/goals
```
**Body:**
```json
{
  "title": "Revise History Chapter 5",
  "description": "Optional description",
  "scheduledDate": "2026-04-01",
  "category": "academic",
  "priority": "high",
  "source": "manual",
  "goalKind": "today",
  "unitType": "binary",
  "executionMode": "manual",
  "linkedFocusEnabled": false,
  "plannedFocusMinutes": null,
  "targetValue": null,
  "achievedValue": 0,
  "status": "not_started",
  "carryForwardMode": "none",
  "subtasks": [
    { "text": "Read pages 50-70" }
  ],
  "startedAt": "2026-04-01T07:00:00.000Z"
}
```
> `scheduledDate` — accepts `YYYY-MM-DD` or any parseable ISO date string; must be today–7 days from now (IST)  
> `title` — required  
> `subtasks` — array of `{ text: string }` objects

**Response `201`:** `GoalObject`  
**Errors:** `400` missing title / invalid date / past date / too far ahead

---

### 3.3 Update / Complete Goal
```
PATCH /api/goals/:id
```
Send only the fields you want to change.

**Body (any combination):**
```json
{
  "completed": true,
  "completedAt": "2026-04-01T10:00:00.000Z",
  "title": "New title",
  "description": "Updated description",
  "scheduledDate": "2026-04-02",
  "category": "health",
  "priority": "medium",
  "goalKind": "repeat",
  "unitType": "count",
  "executionMode": "manual",
  "linkedFocusEnabled": false,
  "plannedFocusMinutes": null,
  "targetValue": 20,
  "achievedValue": 5,
  "status": "in_progress",
  "carryForwardMode": "ask",
  "studiedMinutes": 45,
  "subtasks": [
    { "id": "uuid", "text": "Step 1", "done": true }
  ],
  "startedAt": "2026-04-01T08:00:00.000Z"
}
```
> `startedAt` can be set to `null` to clear the start time.

**Response `200`:**
```json
{ "message": "Goal updated" }
```
If `completed` was included:
```json
{
  "message": "Goal updated",
  "completed": true,
  "completedAt": "2026-04-01T10:00:00.000Z"
}
```

---

### 3.4 Delete Goal
```
DELETE /api/goals/:id
```
**Response `200`:** `{ "message": "Goal deleted" }`  
**Errors:** `404` not found

---

### 3.5 Get Rollover Prompts
```
GET /api/goals/rollover-prompts
```
Returns missed goals that are pending a rollover decision.

**Response `200`:** `GoalObject[]`

---

### 3.6 Rollover Action
```
POST /api/goals/:id/rollover-action
```
**Body:**
```json
{ "action": "retry" }
```
> `action` — `"retry"` (clone to today) or `"archive"` (mark as abandoned)

**Response `200`:**
```json
{
  "message": "Goal rolled over for today",
  "goal": { ... }
}
```
If `action` is `"archive"`:
```json
{ "message": "Goal archived as abandoned" }
```

---

### 3.7 Goal Focus Summary (Batch)
```
POST /api/goals/focus-summary
```
Get total focus time logged against each goal.

**Body:**
```json
{
  "goalIds": ["uuid1", "uuid2"],
  "dayKey": "2026-04-01"
}
```
> `dayKey` — optional, filters to focus sessions on that IST date

**Response `200`:**
```json
{
  "allTime": {
    "uuid1": { "totalMinutes": 90, "sessionCount": 3 }
  },
  "forDay": {
    "uuid1": { "totalMinutes": 45, "sessionCount": 1 }
  }
}
```

---

### 3.8 Get Previous Goals
```
GET /api/goals/previous-goals?period=daily
```
Fetch goals from a previous window (based on `scheduledDate` when available; falls back to `createdAt` for legacy goals).

| Query Param | Values | Default |
|---|---|---|
| `period` | `daily` \| `weekly` \| `monthly` \| `custom` | `daily` |
| `days` | integer (only for `period=custom`) | `1` |

**Response `200`:** `GoalObject[]`

---

### 3.9 Repeat Plan (Batch)
```
POST /api/goals/repeat-plan
```
Clone a set of existing goals into new goals scheduled for today (IST).

**Body:**
```json
{ "goalIds": ["uuid1", "uuid2"] }
```

**Response `200`:**
```json
{
  "message": "2 goal(s) repeated for today",
  "goals": [ { ...GoalObject }, { ...GoalObject } ]
}
```

---

### 3.10 Repeat Single Goal
```
POST /api/goals/:id/repeat
```
Create a copy of a goal for a specific date (defaults to today if omitted).

**Body (optional):**
```json
{ "scheduledDate": "2026-04-03" }
```

**Response `201`:** `GoalObject`

---

### 3.11 Transfer Goal to Ekagra
```
POST /api/goals/:id/transfer-to-ekagra
```
Validates that a goal can be focused in Ekagra (no mutation).

**Response `200`:**
```json
{
  "message": "Goal ready for Ekagra focus",
  "goal": { ... }
}
```
**Errors:** `404` not found / unauthorized, `409` completed or archived goals cannot be transferred

---

### 3.12 Revert Imported Goal
```
POST /api/goals/:id/revert-from-ekagra-import
```
Reverts a goal that was imported into Ekagra back to manual.

**Response `200`:**
```json
{
  "message": "Imported goal reverted to manual",
  "goal": { ... }
}
```
If already manual:
```json
{
  "message": "Goal is already manual",
  "goal": { ... }
}
```
**Errors:** `404` not found / unauthorized, `409` completed imported goals cannot be reverted

---

## 4. Focus Sessions (Ekagra Mode)

> Base path: `/api/focus-sessions`  
> All routes require `Authorization: Bearer <access_token>`

### 4.1 Log a Focus Session
```
POST /api/focus-sessions
```
Call this when a focus session completes or is interrupted.

**Body:**
```json
{
  "plannedDurationMinutes": 25,
  "actualDurationMinutes": 23,
  "breakMinutes": 5,
  "completed": true,
  "interrupted": false,
  "startedAt": "2026-04-01T08:00:00.000Z",
  "completedAt": "2026-04-01T08:23:00.000Z",
  "associatedGoalId": "goal-uuid",
  "preStudyMood": "motivated",
  "postStudyMood": "peaceful",
  "moodScore": 4
}
```
> `actualDurationMinutes` — required, must be > 0  
> `associatedGoalId` — optional, links session to a goal  
> Duplicate detection: if a session with the same startedAt + completedAt + actualMinutes + goalId exists, returns the existing ID without creating a duplicate.

**Response `200`:**
```json
{ "success": true, "id": "session-uuid" }
```

---

### 4.2 Get Focus Stats
```
GET /api/focus-sessions/stats
```
Aggregate statistics for the current user. Results cached for 20 seconds server-side.

**Response `200`:**
```json
{
  "totalFocusMinutes": 4320,
  "totalBreakMinutes": 800,
  "totalSessions": 87,
  "completedSessions": 80,
  "weeklyData": [120, 90, 0, 60, 45, 200, 110],
  "weeklyBreaks": [20, 10, 0, 5, 8, 30, 15],
  "focusStreak": 5,
  "goalsSet": 24,
  "goalsCompleted": 18,
  "dailyGoalMinutes": 240,
  "dailyGoalProgress": 75,
  "hourlyDistribution": [0, 0, 0, 0, 0, 10, 30, 45, ...],
  "recentSessions": [
    {
      "id": "uuid",
      "startedAt": "2026-04-01T08:00:00.000Z",
      "durationMinutes": 25,
      "actualMinutes": 23,
      "completed": true,
      "taskText": "Revise History Chapter 5"
    }
  ]
}
```
> `weeklyData` — array of 7 values (Mon=0, ..., Sun=6), minutes focused per day  
> `hourlyDistribution` — 24-element array, index = hour of day (IST), value = minutes

---

### 4.3 Get Focus Time by Single Goal
```
GET /api/focus-sessions/by-goal/:goalId
```
**Response `200`:**
```json
{
  "totalMinutes": 90,
  "sessionCount": 3
}
```

---

### 4.4 Get Focus Time by Multiple Goals
```
POST /api/focus-sessions/by-goals
```
**Body:**
```json
{
  "goalIds": ["uuid1", "uuid2"],
  "dayKey": "2026-04-01"
}
```
**Response `200`:**
```json
{
  "uuid1": { "totalMinutes": 45, "sessionCount": 2 },
  "uuid2": { "totalMinutes": 30, "sessionCount": 1 }
}
```

---

## 5. Moods / Daily Check-In

> Base path: `/api/moods`  
> All routes require `Authorization: Bearer <access_token>`

### Mood Values
| `mood` label | `intensity` |
|---|---|
| `peaceful` / `happy` | 5 |
| `motivated` | 4 |
| `okay` | 3 |
| `anxious` / `frustrated` | 2 |
| `overwhelmed` / `low` / `numb` | 1 |

---

### 5.1 Get All Moods
```
GET /api/moods
```
**Response `200`:**
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "mood": "motivated",
    "intensity": 4,
    "notes": "Feeling good today",
    "timestamp": "2026-04-01T06:30:00.000Z"
  }
]
```

---

### 5.2 Submit Check-In (Create Mood)
```
POST /api/moods
```
Each check-in updates the check-in streak.

**Body:**
```json
{
  "mood": "motivated",
  "intensity": 4,
  "notes": "Ready to study",
  "preStudyMood": "motivated",
  "postStudyMood": "peaceful"
}
```
> `mood` and `intensity` are required.

**Response `201`:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "mood": "motivated",
  "intensity": 4,
  "notes": "Ready to study",
  "timestamp": "2026-04-01T06:30:00.000Z"
}
```

---

## 6. Journal

> Base path: `/api/journal`  
> All routes require `Authorization: Bearer <access_token>`

### 6.1 Get All Journal Entries
```
GET /api/journal
```
**Response `200`:**
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "content": "Today I finished the Mughal chapter...",
    "timestamp": "2026-04-01T20:00:00.000Z"
  }
]
```

---

### 6.2 Create Journal Entry
```
POST /api/journal
```
**Body:**
```json
{ "content": "Today was productive..." }
```
**Response `201`:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "content": "Today was productive...",
  "timestamp": "2026-04-01T20:00:00.000Z"
}
```

---

### 6.3 Delete Journal Entry
```
DELETE /api/journal/:id
```
**Response `200`:** `{ "message": "Entry deleted" }`  
**Errors:** `404` not found or not owned by user

---

## 7. Streaks

> Base path: `/api/streaks`  
> All routes require `Authorization: Bearer <access_token>`

### 7.1 Get Streaks
```
GET /api/streaks
```
**Response `200`:**
```json
{
  "loginStreak": 7,
  "checkInStreak": 5,
  "goalCompletionStreak": 3,
  "lastActiveDate": "2026-04-01T12:00:00.000Z"
}
```
> Automatically recalculates check-in streak from mood history on each call.

---

## 8. Analytics

> Base path: `/api/analytics`  
> All routes require `Authorization: Bearer <access_token>`

### 8.1 Get Monthly Report
```
GET /api/analytics/monthly-report
```
| Query Param | Format | Default |
|---|---|---|
| `month` | `YYYY-MM` | (optional) |
| `range` | `last30` \| `all` | `last30` (when `month` is omitted) |
| `start` | `YYYY-MM-DD` | (optional) |
| `end` | `YYYY-MM-DD` | (optional) |

Results cached for 5 minutes.

**Response `200`:**
```json
{
  "version": 2,
  "month": "2026-04",
  "generatedAt": "2026-04-01T15:00:00.000Z",
  "executiveSummary": {
    "consistencyScore": 80,
    "completionRate": 75,
    "focusDepth": 45,
    "daysLoggedIn": 24,
    "daysInMonth": 30,
    "evaluationDays": 30,
    "consistentDays": 20,
    "goalsCreated": 40,
    "goalsCompleted": 30,
    "totalFocusMinutes": 1800,
    "totalManualStudyMinutes": 900,
    "focusDays": 15,
    "reflectionDays": 18,
    "checkInDays": 12,
    "journalDays": 8,
    "consistencyMessage": "20 of 30 days had meaningful activity.",
    "completionMessage": "30 of 40 planned manual goals were completed.",
    "focusMessage": "You averaged 45 focused minutes on the days you used Ekagra."
  },
  "insights": {
    "powerHour": {
      "startHour": 9,
      "endHour": 11,
      "message": "You destroy tasks between 9:00 and 11:00. Protect this time!"
    },
    "moodConnection": {
      "anxiousAverageCompletion": 45,
      "normalAverageCompletion": 75,
      "message": "When you feel anxious, your completion rate drops by 30%..."
    },
    "sundayScaries": {
      "weakestDay": "Sunday",
      "weakestDayCompletionRate": 30,
      "message": "You often miss goals on Sundays..."
    }
  },
  "radar": [
    { "subject": "Consistency", "score": 80, "fullMark": 100 },
    { "subject": "Focus", "score": 75, "fullMark": 100 },
    { "subject": "Completion", "score": 75, "fullMark": 100 },
    { "subject": "Reflection", "score": 60, "fullMark": 100 }
  ],
  "heatmap": [
    {
      "date": "2026-04-01",
      "dayOfWeek": "Wed",
      "value": 6,
      "intensity": 3
    }
  ]
}
```
> `heatmap.intensity` — 0–4 (0=none, 1=light, 2=medium, 3=high, 4=max)
> `month` can be a month key (`YYYY-MM`) or a range key (e.g. `last-30-days`, `all-time`, `range:YYYY-MM-DD..YYYY-MM-DD`).

---

### 8.2 Force Regenerate Monthly Report
```
POST /api/analytics/monthly-report/generate
```
**Body (optional):**
```json
{ "month": "2026-03" }
```
**Response `200`:** Same as GET monthly-report. Range params are not accepted here.

---

## 9. Achievements

> Base path: `/api/achievements`  
> All routes require `Authorization: Bearer <access_token>`

### Achievement Types
- **Badges** — Goal completion, focus hours, streaks
- **Titles** — Displayed on dashboard next to user name
- **Emotional Titles** — Special weekly milestone titles

### 9.1 Get User's Earned Achievements
```
GET /api/achievements
```
Auto-evaluates and awards new achievements before responding.

**Response `200`:**
```json
{
  "achievements": [
    {
      "achievement_id": "F001",
      "acquired_at": "2026-04-01T10:00:00.000Z",
      "is_active": true,
      "name": "Deep Diver",
      "type": "badge",
      "category": "focus",
      "tier": 1,
      "display_priority": 10
    }
  ],
  "counts": {
    "badges": 3,
    "titles": 2
  }
}
```

---

### 9.2 Get All Achievements with Progress
```
GET /api/achievements/all
```
Returns every achievement definition with user's current progress.

**Response `200`:**
```json
{
  "achievements": [
    {
      "id": "G001",
      "name": "First Steps",
      "type": "badge",
      "category": "goals",
      "tier": 1,
      "requirement": "Complete 1 goals across all time",
      "holderCount": 1523,
      "earned": true,
      "progress": 100,
      "currentValue": 42,
      "targetValue": 1
    }
  ]
}
```

---

### 9.3 Get Active Title
```
GET /api/achievements/active-title
```
Returns the currently selected title for display.

**Response `200`:**
```json
{
  "title": "Top Tier Energy",
  "type": "title",
  "selectedId": "T001"
}
```
> If user has no titles: `{ "title": null }`

---

### 9.4 Select Active Title
```
POST /api/achievements/select
```
**Body:**
```json
{ "achievementId": "T001" }
```
> Pass `achievementId: null` to clear selection.

**Response `200`:**
```json
{
  "message": "Title updated",
  "selectedId": "T001",
  "title": "Top Tier Energy",
  "type": "title"
}
```

---

### 9.5 Evaluate Weekly Emotional Milestone
```
POST /api/achievements/evaluate-week
```
Evaluates if the user earned an emotional milestone title this week (based on mood + goals + focus patterns). Awards it if eligible.

**Response `200`:**
```json
{
  "title": "Did It Anyway",
  "description": "You checked in feeling down but still crushed a daily goal..."
}
```
> If no milestone: `{ "title": null, "description": null }`

---

### Achievement Definitions Reference

| ID | Name | Type | Criteria |
|---|---|---|---|
| G001 | First Steps | Badge | 1 goal completed |
| G002 | Goal Crusher | Badge | 50 goals |
| G003 | Unstoppable | Badge | 250 goals |
| G004 | The Centurion | Badge | 1000 goals |
| F001 | Deep Diver | Badge | 10 focus hours |
| F002 | Focus Master | Badge | 50 focus hours |
| F003 | Zone Warrior | Badge | 150 focus hours |
| F004 | Monk Mode | Badge | 300 focus hours |
| F005 | Legendary Focus | Badge | 1000 focus hours |
| S001 | Streak Starter | Badge | 3-day check-in streak |
| S002 | Iron Will | Badge | 30-day check-in streak |
| T001–T009 | Various Titles | Title | Login streaks 1–365 days |
| ET001–ET006 | Emotional Titles | Title | Weekly mood + goal patterns |

---

## 10. Suggestions

> Base path: `/api/suggestions`  
> All routes require `Authorization: Bearer <access_token>`

### 10.1 Get Personalized Dashboard Suggestions
```
GET /api/suggestions/personalized
```
Returns user-personalized content based on their latest mood, goals, and focus data.

**Response `200`:**
```json
{
  "greeting": "Good morning, Arjun",
  "period": "morning",
  "mood": {
    "intensity": 4,
    "label": "motivated",
    "category": "high"
  },
  "stats": {
    "activeGoals": 3,
    "completedToday": 1,
    "weeklyFocusHours": 8.5,
    "weeklyFocusSessions": 12
  },
  "moodSuggestions": [
    {
      "title": "Ride the Wave",
      "description": "You're feeling great! Channel this energy into a deep focus session.",
      "action": "Start Focus",
      "link": "/nishtha/focus",
      "icon": "🌊"
    }
  ],
  "dailyChallenge": {
    "title": "Deep Work Block",
    "description": "Complete a 45-minute uninterrupted focus session today.",
    "difficulty": "Medium"
  },
  "mindfulMoment": {
    "quote": "The present moment is filled with joy and happiness...",
    "author": "Thich Nhat Hanh"
  },
  "sosExercises": [
    {
      "title": "4-7-8 Breathing",
      "description": "Breathe in for 4s, hold for 7s, exhale for 8s. Repeat 4 times.",
      "duration": "2 min",
      "icon": "🫁"
    }
  ],
  "focusBoost": {
    "show": true,
    "message": "You've focused 8.5 hours this week across 12 sessions. Incredible pace!",
    "weeklyHours": 8.5,
    "weeklySessions": 12
  },
  "showSOS": false,
  "sleepWindDown": [
    {
      "step": 1,
      "title": "Screens Off",
      "description": "Put away all screens and dim the lights.",
      "time": "30 min before bed"
    }
  ]
}
```
> `sleepWindDown` — only included after 8 PM or if mood is exhausted/tired  
> `showSOS` — true when mood category is `low`

---

## 11. File Uploads

> Base path: `/api/upload`  
> All routes require `Authorization: Bearer <access_token>`

### 11.1 Upload Avatar
```
POST /api/upload/avatar
Content-Type: multipart/form-data
```
**Form data:**
- `file` — image file (JPEG, PNG, WebP, GIF)

> Max file size: 5MB. Automatically replaces old avatar. Deletes old file from disk.

**Response `200`:**
```json
{
  "success": true,
  "url": "/uploads/avatars/abc123.webp"
}
```

---

### 11.2 General File Upload
```
POST /api/upload
Content-Type: multipart/form-data
```
**Form data:**
- `file` — image or audio file

**Response `200`:**
```json
{
  "success": true,
  "url": "/uploads/files/abc123.webp",
  "id": "abc123.webp"
}
```
**Legacy compatibility (deprecated):** This endpoint also accepts JSON uploads:
```json
{ "data": "<base64>", "mimeType": "audio/mpeg" }
```
If accepted, response URL will be:
- `url: "/api/images/:id"` (served from MongoDB base64 storage)

If legacy JSON uploads are disabled, the server returns `410 Gone` with:
```json
{
  "success": false,
  "message": "Legacy JSON uploads are deprecated. Please upload using multipart/form-data."
}
```

---

### 11.3 Serve Legacy Uploaded Image
```
GET /api/images/:id
```
No auth required. Returns binary image data.

---

### 11.4 Uploaded Files (Disk-based)
```
GET /uploads/<path>
```
Static file serving. Cached for 30 days (`Cache-Control: public, max-age=2592000, immutable`).  
> In production, Nginx serves `/uploads/` directly.

---

### 11.5 Legacy Upload Usage Metrics (Server Ops)
```
GET /api/upload/legacy-usage-metrics?days=30
Authorization: Bearer <access_token>
```
Returns aggregated usage for legacy base64 upload/read paths, plus a daily breakdown for the requested window.

---

## 12. Mehfil (Community)

Mehfil has:
- REST endpoints for activity, saved posts, comments, moderation actions, meditation video setting, and Sandesh announcements.
- A Socket.IO namespace for the realtime feed ("thoughts") and realtime DMs.

### 12.0 Availability Check (Public)
```
GET /api/mehfil
```
**Response `200`:** `{ "paused": false }`  
**Response `503`:** `{ "message": "<pause reason>" }`

---

### 12.1 Meditation Video Setting
Public:
```
GET /api/mehfil/meditation-video
```
**Response `200`:**
```json
{ "videoUrl": "https://youtu.be/..." }
```

Admin-only:
```
POST /api/mehfil/meditation-video
Authorization: Bearer <access_token>
```
**Body:**
```json
{ "videoUrl": "https://youtu.be/..." }
```

---

### 12.2 Saved Posts
```
GET /api/mehfil/saved-posts?page=1&limit=20
Authorization: Bearer <access_token>
```
**Response `200`:**
```json
{
  "posts": [],
  "reactedThoughtIds": [],
  "page": 1,
  "hasMore": false
}
```

---

### 12.3 My Mehfil Activity
```
GET /api/mehfil/activity
Authorization: Bearer <access_token>
```
Returns a recent combined feed of your posts/comments/likes.

---

### 12.4 Interactions (Comments, Saves, Reports, Shares)
> Base path: `/api/mehfil/interactions`  
> All routes require `Authorization: Bearer <access_token>`

**Comments**
```
GET    /api/mehfil/interactions/comments/:thoughtId?page=1&limit=30
POST   /api/mehfil/interactions/comments
DELETE /api/mehfil/interactions/comments/:commentId
```
`POST` body:
```json
{ "thoughtId": "uuid", "content": "Keep it up!" }
```

**Saves / Bookmarks**
```
POST /api/mehfil/interactions/save
GET  /api/mehfil/interactions/save/:thoughtId
```
`POST` body:
```json
{ "thoughtId": "uuid" }
```

**Reports**
```
POST /api/mehfil/interactions/report
```
Body:
```json
{ "thoughtId": "uuid", "reason": "spam" }
```

**Shares**
```
POST /api/mehfil/interactions/share
```
Body:
```json
{ "thoughtId": "uuid", "platform": "whatsapp" }
```

---

### 12.5 Sandesh (Announcements)
> Base path: `/api/mehfil/sandesh`

Public:
```
GET /api/mehfil/sandesh
GET /api/mehfil/sandesh/:id/reactions
GET /api/mehfil/sandesh/:id/comments?page=1&limit=30
```

Authenticated:
```
POST   /api/mehfil/sandesh/preview
POST   /api/mehfil/sandesh/:id/react
POST   /api/mehfil/sandesh/:id/comments
DELETE /api/mehfil/sandesh/:sandeshId/comments/:commentId
```

Admin-only:
```
POST   /api/mehfil/sandesh
PUT    /api/mehfil/sandesh/:id
DELETE /api/mehfil/sandesh/:id
```

---

### 12.6 Direct Messages (REST)
> Base path: `/api/dm`  
> All routes require `Authorization: Bearer <access_token>`

```
GET  /api/dm/status?targetUserId=uuid
GET  /api/dm/handles/me
POST /api/dm/handles
```
`POST /api/dm/handles` body:
```json
{ "linkedin": "myhandle", "instagram": "myhandle", "discord": "myhandle" }
```

---

### Mehfil Real-Time (Socket.IO)
Namespace: `/mehfil` (Socket.IO path: `/socket.io`).

**Client -> Server events**
| Event | Payload (summary) |
|---|---|
| `register` | `{ id, name, avatar }` |
| `joinRoom` | `{ room: "ACADEMIC" \| "REFLECTIVE" \| "ALL" }` |
| `loadThoughts` | `{ page, limit, room }` |
| `newThought` | `{ content, imageUrl?, isAnonymous?, room? }` |
| `toggleReaction` | `{ thoughtId }` |
| `editThought` | `{ thoughtId, content }` |
| `deleteThought` | `{ thoughtId }` |

**Server -> Client events**
| Event | Description |
|---|---|
| `onlineCount` | Current online count |
| `roomJoined` | Confirms active room |
| `thoughts` | Feed page payload `{ thoughts, room, page, hasMore }` |
| `thoughtAccepted` | Thought accepted (sender) |
| `thoughtCreated` | New thought broadcast |
| `reactionUpdated` | Like/unlike count changed |
| `thoughtUpdated` | Edited thought broadcast |
| `thoughtDeleted` | Deleted thought broadcast |
| `thoughtRejected` | Thought rejected (blocked language / moderation) |
| `thoughtRerouted` | Thought category changed by moderation |
| `postingBanStatus` | Posting ban status updates |

**DM events (same namespace)**
Client -> Server:
`dm:request`, `dm:sync_pending`, `dm:accept`, `dm:decline`, `dm:message`, `dm:share_handle`, `dm:leave_room`

Server -> Client:
`dm:incoming_request`, `dm:request_sent`, `dm:accepted`, `dm:declined`, `dm:opened`, `dm:message`, `dm:handle_received`, `dm:user_left`, `dm:error`

---

## 13. Study Planner

> Base path: `/api/plans`  
> All routes require `Authorization: Bearer <access_token>`

The planner stores nested data:
- Plan -> Subjects -> Chapters -> Topics

Most mutating endpoints return the updated full plan document.

### 13.1 List Plans (Summary)
```
GET /api/plans
```
Returns an array of plans with `completionPercent` and `totalTopics`.

---

### 13.2 Get Plan by ID
```
GET /api/plans/:planId
```
Returns the full plan plus a `progress` rollup.

---

### 13.3 Create Plan
```
POST /api/plans
```
Free tier supports only 1 plan; premium supports unlimited.

---

### 13.4 Update Plan Metadata
```
PATCH /api/plans/:planId
```

---

### 13.5 Delete Plan
```
DELETE /api/plans/:planId
```

---

### 13.6 Add / Remove Subjects
```
POST   /api/plans/:planId/subjects
DELETE /api/plans/:planId/subjects/:subjectId
```

---

### 13.7 Add / Remove Chapters
```
POST   /api/plans/:planId/subjects/:subjectId/chapters
DELETE /api/plans/:planId/subjects/:subjectId/chapters/:chapterId
```

---

### 13.8 Add / Update / Delete Topics
```
POST   /api/plans/:planId/subjects/:subjectId/chapters/:chapterId/topics
PATCH  /api/plans/:planId/topics/:topicId
DELETE /api/plans/:planId/topics/:topicId
```
`PATCH` supports updating:
- `status`: `todo` | `in_progress` | `done` | `revision_needed`
- `plannedDate`: ISO string (or empty string to clear)
- `notes`: string

---

### 13.9 Calendar View
```
GET /api/plans/:planId/calendar
```

---

### 13.10 Analytics (Premium Only)
```
GET /api/plans/:planId/analytics
```
Returns `{ progress, heatmap }`. If the plan is not premium, returns `403`.

---

### 13.11 Auto-Distribute Topics (Premium Only)
```
POST /api/plans/:planId/auto-distribute
```

---

### 13.12 Upgrade Planner (Server-Controlled)
```
POST /api/plans/:planId/upgrade
```
Marks the plan as premium (`features.isPremium = true`).

---

### 13.13 Import Syllabus (Replace or Merge)
```
POST /api/plans/:planId/import-syllabus
```
**Body:**
```json
{
  "mode": "replace",
  "subjects": [
    {
      "name": "Physics",
      "chapters": [
        {
          "name": "Mechanics",
          "topics": ["Newton's Laws", "Friction"]
        }
      ]
    }
  ]
}
```
- `mode`: `replace` (default) overwrites the plan syllabus; `merge` adds only new names.
- `subjects`, `chapters`, and `topics` must be non-empty.
- Names are deduplicated case-insensitively during import.
- Free tier enforces the 30-topic limit (`403` with code `TOPIC_LIMIT`).

**Response `200`:** Returns the full updated plan document.

**Errors:** `400` invalid payload, `403` topic limit, `409` conflict (stale `updatedAt`).

---

## 14. Error Codes

| Status | Meaning | Common Causes |
|---|---|---|
| `400` | Bad Request | Missing/invalid fields |
| `401` | Unauthorized | Missing/expired access token |
| `403` | Forbidden | Not allowed to access resource |
| `404` | Not Found | Resource doesn't exist |
| `409` | Conflict | Duplicate (email, stale token) |
| `410` | Gone | Deprecated endpoint |
| `429` | Too Many Requests | Rate limit hit |
| `500` | Internal Server Error | Server-side bug |
| `503` | Service Unavailable | External service (email) down |

**Standard Error Response:**
```json
{ "message": "Human-readable error description" }
```
Auth middleware errors (401) use:
```json
{ "error": "token_expired" }
```
Common `error` values: `unauthenticated`, `token_expired`, `invalid_token`, `token_revoked`.

---

## 15. Rate Limiting

| Limit | Window | Applies To |
|---|---|---|
| 100 requests | 1 minute | All `/api/*` routes (per IP) |
| 5 requests | 15 minutes | `/api/auth/forgot-password` |
| 10 requests | 15 minutes | `/api/auth/reset-password/confirm` |

Rate limit headers returned: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`  
On `429`: `Retry-After` header gives seconds to wait.

---

## 16. Payments

> Base path: `/api/payments`

### 16.1 List Courses
```
GET /api/payments/courses
```

---

### 16.2 Payments Config / Availability
```
GET /api/payments/config
```
Returns whether the payment provider is configured on the server.

---

### 16.3 Create Order
```
POST /api/payments/create-order
Authorization: Bearer <access_token>
```
**Body:**
```json
{ "courseId": "safar-30" }
```
**Response `200`:** Includes Razorpay `order` + `keyId`.

---

### 16.4 Verify Payment (Client Callback)
```
POST /api/payments/verify
Authorization: Bearer <access_token>
```
**Body:**
```json
{
  "razorpay_order_id": "order_...",
  "razorpay_payment_id": "pay_...",
  "razorpay_signature": "...",
  "courseId": "safar-30"
}
```
**Response `200`:**
```json
{
  "success": true,
  "message": "Payment verified and enrollment granted",
  "paymentId": "pay_...",
  "enrollmentId": "uuid"
}
```

---

### 16.5 Purchase Status
```
GET /api/payments/status/:courseId
Authorization: Bearer <access_token>
```

---

### 16.6 Payment History
```
GET /api/payments/history
Authorization: Bearer <access_token>
```

---

### 16.7 Enrollments
```
GET /api/payments/enrollments
Authorization: Bearer <access_token>
```

---

## 17. Focus Overlay (Web)

> Base path: `/api/focus-overlay`  
> All routes require `Authorization: Bearer <access_token>`

### 17.1 Get Overlay State + Stats
```
GET /api/focus-overlay/state
```

---

### 17.2 Save Overlay State
```
PUT /api/focus-overlay/state
```
**Body:**
```json
{ "state": { "...": "..." } }
```
**Errors:** `413` state payload too large

---

### 17.3 Flush Activity Chunks
```
POST /api/focus-overlay/flush
```
Used to send time chunks for per-section activity tracking and daily aggregates.

---

## 18. Ekagra Sessions (Timer State)

> Base path: `/api/ekagra-sessions`  
> All routes require `Authorization: Bearer <access_token>`

These endpoints manage **live Ekagra timer state** (active/paused sessions, remaining time, and session analytics).

### 18.1 List Sessions (Open + Recent Closed)
```
GET /api/ekagra-sessions
```
Returns open (active/paused) sessions plus recent closed sessions.

**Response `200`:**
```json
{ "sessions": [ { "id": "uuid", "status": "paused", "mode": "Timer", "totalSeconds": 1500, "remainingSeconds": 900, "goalId": "uuid", "goalTitle": "History", "pauseCount": 2, "createdAt": "2026-04-01T05:30:00.000Z" } ] }
```

---

### 18.2 Get Active Session
```
GET /api/ekagra-sessions/active
```
**Response `200`:**
```json
{ "session": { "...": "..." } }
```
If none active: `{ "session": null }`

---

### 18.3 Analytics (Timer Usage)
```
GET /api/ekagra-sessions/analytics
```
Returns timer usage analytics, focus/break minutes, recent sessions, streaks, and top tasks.

**Response `200`:**
```json
{
  "totalFocusMinutes": 420,
  "totalBreakMinutes": 60,
  "timerUsageCount": 18,
  "breakSessionsCount": 6,
  "shortBreakSessionsCount": 4,
  "longBreakSessionsCount": 2,
  "longDurationSessionCount": 3,
  "averageTimerMinutes": 25,
  "mostUsedTimerDurationMinutes": 25,
  "totalSessions": 18,
  "completedSessions": 14,
  "endedEarlySessions": 4,
  "abandonedSessions": 4,
  "weeklyData": [30, 20, 0, 40, 50, 60, 20],
  "weeklyBreaks": [5, 10, 0, 5, 10, 20, 10],
  "focusStreak": 3,
  "hourlyDistribution": [0,0,0,0,0,10,20,30, ...],
  "recentSessions": [ { "id": "uuid", "durationMinutes": 25, "actualMinutes": 23, "status": "completed" } ],
  "focusSessions": [ { "id": "uuid", "durationMinutes": 25, "actualMinutes": 23, "status": "completed" } ],
  "topTasks": [ { "label": "History", "minutes": 120, "count": 4 } ],
  "timerDurationUsage": [ { "durationMinutes": 25, "count": 12, "sessionType": "focus" } ]
}
```

---

### 18.4 Activate Session
```
POST /api/ekagra-sessions/activate
```
**Body:**
```json
{
  "goalId": "uuid",
  "goalTitle": "History",
  "totalSeconds": 1500,
  "remainingSeconds": 1500,
  "mode": "Timer",
  "isRunning": true,
  "sessionStartedAt": "2026-04-01T08:00:00.000Z",
  "overrideActive": false,
  "importedFromGoal": false,
  "source": "manual"
}
```
**Notes:**
- Only Ekagra goals (or goals with `linked_focus_enabled`) can be activated.
- If another session is active and `overrideActive=false`, returns `409` with `code: "ACTIVE_SESSION_CONFLICT"`.

**Response `201/200`:**
```json
{ "session": { "...": "..." } }
```

---

### 18.5 Update Session
```
PATCH /api/ekagra-sessions/:id
```
Update any subset of:
`mode`, `totalSeconds`, `remainingSeconds`, `isRunning`, `sessionStartedAt`, `status`, `goalTitle`, `source`, `importedFromGoal`.

**Status transitions:**
- `completed` sets `ended_at` + `completed_at`
- `ended_early` sets `ended_at`
- `discarded` sets `discarded_at`
- `paused` increments pause count
- `active` pauses other active sessions

**Response `200`:**
```json
{ "session": { "...": "..." } }
```

---

### 18.6 Complete Session
```
POST /api/ekagra-sessions/:id/complete
```
**Body (optional):**
```json
{ "elapsedSeconds": 1480, "remainingSeconds": 20, "mode": "Timer", "sessionStartedAt": "2026-04-01T08:00:00.000Z" }
```
Sets `status` to `completed` or `ended_early` based on tolerance.

**Response `200`:**
```json
{ "session": { "...": "..." } }
```

---

### 18.7 Discard Session
```
POST /api/ekagra-sessions/:id/discard
```
If the session has meaningful elapsed time (>5s), it is marked `ended_early`; otherwise `discarded`.

**Response `200`:**
```json
{ "session": { "...": "..." } }
```

---

### 18.8 Delete Session
```
DELETE /api/ekagra-sessions/:id
```
**Response `200`:**
```json
{ "ok": true, "deletedId": "uuid" }
```

---

## 19. Mission (MVP)

> Base path: `/api/mission`  
> **Note:** Current implementation is MVP and returns mocked data. Auth context is mocked server-side for dev.

### 19.1 Get Today Dashboard
```
GET /api/mission/today
```
Returns mock tasks, due revisions, backlog alerts, active recovery, and readiness snapshot.

---

### 19.2 Get Active Plan
```
GET /api/mission/plan/active
```
Returns mock active plan info + readiness snapshot.

---

### 19.3 Get Revision Items
```
GET /api/mission/revision
```
Returns `{ "items": [] }` (mock).

---

### 19.4 Create/Update Mission Profile (Mock)
```
POST /api/mission/profile
```
Returns `{ "profile_id": "prof_new_123", "saved": true }`.

---

## 20. System / Health & Debug

### 20.1 Ping
```
GET /api/ping
```
Returns `{ "message": "<PING_MESSAGE or ping>" }`.

---

### 20.2 Redis Health
```
GET /health/redis
```
Returns:
- `{ "redis": "disabled" }` if Redis is not configured
- `{ "redis": "PONG" }` when healthy
- `{ "redis": "down" }` when unreachable

---

### 20.3 Demo
```
GET /api/demo
```
Returns:
```json
{ "message": "Hello from Express server" }
```

---

## 🤖 Android Integration Guide

### Recommended Stack
- **HTTP:** Retrofit2 + OkHttp3
- **Auth:** Store `accessToken` in `EncryptedSharedPreferences`; use OkHttp `CookieJar` for the `rt` refresh cookie
- **Token Refresh:** Implement an OkHttp `Authenticator` that calls `POST /api/auth/refresh` on 401 responses (especially when body is `{ "error": "token_expired" }`)
- **Socket.IO:** `socket.io-client-java` (v2.x) for Mehfil real-time features

### Auth Flow Diagram
```
App Start
  │
  ▼
GET /api/auth/me ──────────────────────► 200 → Load dashboard
     │
     └── 401 → POST /api/auth/refresh ─► 200 → Retry with new token
                      │
                      └── 401/409 → Show Login Screen
```

### Cookie Handling (Android)
OkHttp `CookieJar` automatically stores and sends the `rt` HttpOnly cookie. For the base URL, use your production domain so `__Host-rt` cookie restrictions are satisfied.

```kotlin
val cookieJar = JavaNetCookieJar(CookieManager().apply {
    setCookiePolicy(CookiePolicy.ACCEPT_ALL)
})
val client = OkHttpClient.Builder()
    .cookieJar(cookieJar)
    .addInterceptor(AuthInterceptor(tokenStore))
    .authenticator(TokenRefreshAuthenticator(tokenStore, api))
    .build()
```
