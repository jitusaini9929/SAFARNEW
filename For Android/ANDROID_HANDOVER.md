------------------------------------------------------------
1️⃣ PROJECT STRUCTURE ANALYSIS
------------------------------------------------------------
- **Is this a monorepo or separated frontend/backend?**
  It is a Monorepo containing both the frontend (React/Vite) and backend (Express/Node) within the same repository (`d:\SAFAR`).
- **Is backend present?**
  Yes.
- **Backend framework detected?**
  Express.js (Node.js).
- **Frontend framework detected?**
  React.js (with Vite builder).
- **Database used?**
  MongoDB.
- **ORM used?**
  None (Raw `mongodb` native driver is used).
- **Hosting assumptions?**
  Assumed to be hosted on platforms like Render/Heroku/Vultr (due to `trust proxy` setting and `nixpacks.toml`/`railway.json` presence). Redis is optional and used for token/blocklist storage + Socket.io scaling fallback behavior.

**Explanation of Frontend/Backend Communication:**
The React frontend communicates with the Express backend via REST API calls (typically prefixed with `/api/`). Auth now uses short-lived JWT access tokens in the `Authorization: Bearer <token>` header, with a secure HTTP-only refresh cookie (`__Host-rt`) for token rotation (`/api/auth/refresh`). There is also a real-time Socket.io connection used for community features ("Mehfil").

------------------------------------------------------------
2️⃣ BACKEND DETECTION
------------------------------------------------------------
- **Is there a backend server?** Yes.
- **Where is it located in the repo?** In the `server/` directory.
- **Is it REST or GraphQL?** REST.
- **Is it production-ready or mock?** Production-ready.
- **Are API routes defined?** Yes, comprehensively mapped out in `server/routes/` (20 route files).
- **Are there controllers/services?** Logic is primarily housed directly within the route definitions in `server/routes/` rather than highly abstracted service layers.
- **Are environment variables used?** Yes (loaded via `dotenv` and custom `load-env.ts`).
- **Are secret keys exposed?** No, secrets like `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `SESSION_SECRET`, `RAZORPAY_KEY_SECRET`, `GMAIL_APP_PASSWORD`, `GROQ_API_KEY`, etc. are expected to be in `.env`.

------------------------------------------------------------
3️⃣ COMPLETE API EXTRACTION
------------------------------------------------------------

### **Authentication APIs** (`/api/auth`)
- **POST `/api/auth/signup`** (Public) - Creates user. Body: `{ name, email, password, examType, preparationStage, gender, profileImage }`. Allowed email domains: `gmail.com`, `outlook.com`.
- **POST `/api/auth/login`** (Public) - Authenticates. Body: `{ email, password }`. Response returns `{ accessToken, user }` and sets HTTP-only refresh cookie `__Host-rt`. Triggers login streak update and perk evaluation.
- **POST `/api/auth/refresh`** (Public, Cookie Req) - Rotates refresh token family and returns a new `{ accessToken }`.
- **POST `/api/auth/logout`** (Auth Req) - Revokes token family/blocklists active access token and clears refresh cookie.
- **POST `/api/auth/forgot-password`** (Public, Rate Limited: 5/15min) - Sends reset email via Gmail SMTP. Body: `{ email }`.
- **POST `/api/auth/reset-password/confirm`** (Public, Rate Limited: 10/15min) - Confirms reset. Body: `{ token, newPassword }`. Min password: 8 chars.
- **GET `/api/auth/me`** (Auth Req) - Returns current user profile, streaks (login, check-in, goal completion), and logs daily login history. Response: `{ user: {...}, streaks: {...} }`
- **PATCH `/api/auth/profile`** (Auth Req) - Updates user details. Body: `{ name, examType, preparationStage, gender, avatar }`
- **GET `/api/auth/login-history`** (Auth Req) - Returns user's login timestamps.
- **POST `/api/auth/check-email`** (Deprecated, returns 410)
- **POST `/api/auth/reset-password`** (Deprecated, returns 410)

### **Payment APIs** (`/api/payments`)
- **GET `/api/payments/courses`** (Public) - Lists available courses.
- **POST `/api/payments/create-order`** (Auth Req) - Creates a Razorpay order. Body: `{ courseId }`.
- **POST `/api/payments/verify`** (Auth Req) - Verifies client-side payment success. Body: `{ razorpay_order_id, razorpay_payment_id, razorpay_signature, courseId }`.
- **POST `/api/payments/webhook`** (Public) - Server-side webhook for `payment.captured` event. (Verifies signature via `x-razorpay-signature` header).
- **GET `/api/payments/status/:courseId`** (Auth Req) - Checks if user has access.
- **GET `/api/payments/history`** (Auth Req) - User's transaction history.
- **GET `/api/payments/enrollments`** (Auth Req) - User's active course enrollments.

### **Upload/Media APIs** (`/api/upload`, `/api/images`)
- **POST `/api/upload/avatar`** (Auth Req) - Upload/replace avatar via `multipart/form-data` field `avatar`. Returns hosted URL path.
- **POST `/api/upload`** (Auth Req) - General upload endpoint. Supports `multipart/form-data` field `file` (preferred) and legacy JSON `{ data, mimeType }` (backward compatible).
- **GET `/api/images/:id`** (Public) - Serves uploaded image/audio as binary buffer.

### **Goals APIs** (`/api/goals`) — *Enhanced*
- **GET `/api/goals`** (Auth Req) - Lists all user goals (auto-syncs expired → missed). Returns: `[{ id, title, description, category, priority, subtasks, type, completed, scheduledDate, expiresAt, lifecycleStatus, ... }]`
- **POST `/api/goals`** (Auth Req) - Creates a goal. Body: `{ title, description, scheduledDate, category, priority, subtasks, startedAt }`. Categories: `academic | health | personal | other`. Priorities: `high | medium | low`. Scheduled up to 7 days ahead.
- **PATCH `/api/goals/:id`** (Auth Req) - Updates goal (title, description, category, priority, subtasks, scheduledDate, completed toggle). Supports `completedAt` client timestamp. Updates goal completion streak on first daily completion.
- **DELETE `/api/goals/:id`** (Auth Req) - Deletes a goal.
- **GET `/api/goals/rollover-prompts`** (Auth Req) - Gets missed goals pending rollover action.
- **POST `/api/goals/:id/rollover-action`** (Auth Req) - Retry (clone for today) or archive a missed goal. Body: `{ action: "retry" | "archive" }`.
- **GET `/api/goals/previous-goals`** (Auth Req) - Fetches historical goals. Query: `?period=daily|weekly|monthly|custom&days=N`.
- **POST `/api/goals/repeat-plan`** (Auth Req) - Bulk-clones previous goals for today. Body: `{ goalIds: [...] }`. Max 50.
- **POST `/api/goals/:id/repeat`** — Repeat a single goal for a specific date.

### **Mood/Check-In APIs** (`/api/moods`) — *Enhanced*
- **GET `/api/moods`** (Auth Req) - Returns all mood entries, sorted by timestamp desc.
- **POST `/api/moods`** (Auth Req) - Creates mood check-in. Body: `{ mood, intensity, notes, preStudyMood, postStudyMood }`. Also writes a `mood_snapshot` record. Auto-calculates and updates `check_in_streak`.

### **Journal APIs** (`/api/journal`)
- **GET `/api/journal`** (Auth Req) - Lists all journal entries.
- **POST `/api/journal`** (Auth Req) - Creates entry. Body: `{ content }`.
- **DELETE `/api/journal/:id`** (Auth Req) - Deletes entry.

### **Streaks APIs** (`/api/streaks`)
- **GET `/api/streaks`** (Auth Req) - Returns user's streaks (login, check-in, goal completion).
- **PATCH `/api/streaks`** (Auth Req) - Updates streaks.

### **Focus Session APIs** (`/api/focus-sessions`) — *Enhanced*
- **POST `/api/focus-sessions`** (Auth Req) - Logs a focus session. Body: `{ durationMinutes, breakMinutes, completed, associatedGoalId, interrupted, preStudyMood, postStudyMood, moodScore }`. Also writes `focus_session_logs` and optional `mood_snapshots`.
- **GET `/api/focus-sessions/stats`** (Auth Req) - Aggregated stats: total minutes/sessions, weekly data, weekly breaks, focus streak, goals stats, hourly distribution, recent sessions.
- **GET `/api/focus-sessions/by-goal/:goalId`** (Auth Req) - Focus time for a specific goal.
- **POST `/api/focus-sessions/by-goals`** (Auth Req) - Focus time for multiple goals. Body: `{ goalIds: [...] }`. Max 100.

### **Focus Overlay APIs** (`/api/focus-overlay`)
- Real-time focus overlay state management (Pomodoro timer, active/paused/completed states).

### **Achievements APIs** (`/api/achievements`) — *NEW*
- **GET `/api/achievements`** (Auth Req) - Returns user's earned achievements (badges + titles) with counts.
- **GET `/api/achievements/all`** (Auth Req) - Returns ALL achievement definitions with user progress (current value, target, percentage, holder count, earned status).
- **GET `/api/achievements/active-title`** (Auth Req) - Gets user's currently selected/displayed title.
- **POST `/api/achievements/select`** (Auth Req) - Select an achievement as active title. Body: `{ achievementId }`.
- **POST `/api/achievements/evaluate-week`** (Auth Req) - Evaluates emotional milestones on-demand (e.g., "Did It Anyway", "Pushed Through Overwhelm", "Showed Up Tired").
- **Badges:** Goal Completion (First Steps → The Centurion), Focus (Deep Diver → Legendary Focus), Streak (Streak Starter, Iron Will), Special (Flow State).
- **Titles:** Goal-based (Heavy Heart High Effort → High Energy Ace), Login-streak-based (Top Tier Energy → Zen Master).
- **Emotional Titles:** "Did It Anyway", "Quiet Consistency", "Pushed Through Overwhelm", "Showed Up Tired", "Survived Bad Week".

### **Perks APIs** (`/api/perks`) — *NEW* (via dynamic import in `index.ts`)
- **GET `/api/perks`** — Registered via dynamic import (`await import("./routes/perks")`). Note: The route mount point should be verified; in `index.ts` the perk definitions are seeded at startup but the perks routes are NOT explicitly mounted with `app.use`. They may be accessed via `checkPerks()` triggered during login, or may require explicit mounting. **Verify in deployment.**
- **GET `/api/perks/all`** (Auth Req) - All perk definitions with user progress.
- **GET `/api/perks/active`** (Auth Req) - User's currently selected perk.
- **POST `/api/perks/select`** (Auth Req) - Select a perk. Body: `{ perkId }`.
- **Aura perks:** Focus-tier (Silent Flame → Eternal Forge), Goal-tier (Spark → Adamant Will).
- **Echo perks:** Streak-based (Whisper → Thunder), Mood-based (Inner Peace, Emotional Anchor).
- **Mechanics:** Perks can be **revoked** if streak-based criteria are no longer met.

### **Sandesh / Announcements APIs** (`/api/mehfil/sandesh`) — *NEW*
- **GET `/api/mehfil/sandesh`** (Public/Auth) - Lists announcements (admin: all, users: latest 5). Response: `{ sandesh, sandeshes[], isAdmin }`.
- **POST `/api/mehfil/sandesh`** (Admin Only) - Posts announcement. Body: `{ content, importance, link_meta, image_url, audio_url }`. Content filtered for blocked words.
- **PUT `/api/mehfil/sandesh/:id`** (Admin Only) - Updates announcement.
- **DELETE `/api/mehfil/sandesh/:id`** (Admin Only) - Deletes announcement.
- **POST `/api/mehfil/sandesh/preview`** (Auth Req) - Fetches URL metadata (og:title, og:image, etc.). Body: `{ url }`.
- **POST `/api/mehfil/sandesh/:id/react`** (Auth Req) - Toggle like/unlike on announcement.
- **GET `/api/mehfil/sandesh/:id/reactions`** (Public) - Get reaction count and user's like status.
- **GET `/api/mehfil/sandesh/:id/comments`** (Public) - Get comments with author info.
- **POST `/api/mehfil/sandesh/:id/comments`** (Auth Req) - Post comment. Body: `{ content }`. Filtered for blocked words.
- **DELETE `/api/mehfil/sandesh/:sandeshId/comments/:commentId`** (Auth Req) - Delete own comment.

### **DM / Social Handles APIs** (`/api/dm`) — *NEW*
- **GET `/api/dm/status`** (Auth Req) - Check if a user is online. Query: `?targetUserId=<id>`.
- **POST `/api/dm/handles`** (Auth Req) - Save social handles. Body: `{ linkedin, instagram, discord }`.
- **GET `/api/dm/handles/me`** (Auth Req) - Get own social handles.

### **Personalized Suggestions APIs** (`/api/suggestions`) — *NEW*
- **GET `/api/suggestions/personalized`** (Auth Req) - Returns personalized dashboard based on user's mood, goals, and focus data:
  - `greeting` — Time-of-day greeting with user's first name
  - `mood` — Current mood intensity, label, category
  - `stats` — Active goals, completed today, weekly focus hours/sessions
  - `moodSuggestions` — 3 mood-based recommendations (low/neutral/high) with links to app features
  - `dailyChallenge` — Rotating daily challenge (title, description, difficulty)
  - `mindfulMoment` — Daily inspirational quote
  - `sosExercises` — 4 panic/anxiety relief exercises (4-7-8 Breathing, 5-4-3-2-1 Grounding, Body Scan, Cold Water Splash)
  - `focusBoost` — Focus motivation message with weekly stats
  - `sleepWindDown` — 5-step bedtime routine (shown after 8 PM or if user is tired)
  - `showSOS` — Boolean flag when mood is low

### **Analytics APIs** (`/api/analytics`) — *Enhanced*
- **GET `/api/analytics/monthly-report`** (Auth Req) - Fetches stored monthly report. Query: `?month=YYYY-MM`.
- **POST `/api/analytics/monthly-report/generate`** (Auth Req) - Generates full monthly analytics report including:
  - **Executive Summary:** Consistency score, completion rate, focus depth, days logged in, goals created/completed, total focus minutes.
  - **Insights:** Power Hour (peak productivity time), Mood-Goal Connection (completion drop during anxious days), Sunday Scaries (weakest day for goals).
  - **Badge Summary:** The Finisher, Early Bird, Night Owl badges.
  - **Radar Chart:** Consistency, Focus, Completion, Mood scores.
  - **Activity Heatmap:** Daily activity intensity for the full month.

### **Mehfil Social APIs** (`/api/mehfil`, `/api/mehfil/interactions`)
- Community social feed for posting "thoughts" by category.
- **Interactions:** Reactions, comments, saves, shares, reports, friend requests.
- **Moderation:** Content filtering, shadow banning, progressive ban system, spam strikes.
- **Socket.IO Namespace:** `/mehfil` for real-time feeds.

### **Utility**
- **GET `/api/ping`** - Health check. Returns `{ message: "ping" }`.

------------------------------------------------------------
4️⃣ AUTHENTICATION ANALYSIS
------------------------------------------------------------
- **Session-based or JWT?** JWT-based.
- **Token generation logic?** Access/refresh JWTs are issued from `server/lib/jwt.service.ts`. Refresh token family state and access-token blocklist are stored in Redis when available, otherwise in-memory fallback (`server/lib/token.store.ts`).
- **Token expiry?** Access token short-lived (default 15m). Refresh token long-lived (default 30d, rotated on each refresh).
- **Refresh token present?** Yes (`/api/auth/refresh`).
- **Cookie-based auth?** Partially. Access token is Bearer header; refresh token is an HTTP-only cookie (`__Host-rt`).
- **OAuth/social login?** None detected.
- **CSRF protection?** Code exists in `server/index.ts` but is **currently commented out/paused**.
- **Email domain restriction?** Signups restricted to `gmail.com` and `outlook.com` only.
- **Mobile compatibility issues?** **MEDIUM.** Mobile must manage both Bearer access token lifecycle and refresh cookie persistence for silent token rotation.

**Changes Required for Android:**
Implement an access-token manager for `Authorization: Bearer <token>` and maintain refresh cookie support (OkHttp `CookieJar`) for `/api/auth/refresh`. On app cold-start, attempt refresh to obtain a new access token before protected API calls.

------------------------------------------------------------
5️⃣ DATABASE STRUCTURE
------------------------------------------------------------
- **Models/Entities (35+ Collections):**
  - `users`: id, email, password_hash, name, avatar, exam_type, preparation_stage, gender, is_shadow_banned, spam_strike_count, selected_perk_id, selected_achievement_id, mehfil_banned_forever, mehfil_banned_until, mehfil_ban_level.
  - `password_reset_tokens`: id, user_id, token_hash, expires_at, used_at.
  - `login_history`: id, user_id, timestamp.
  - `goals`: id, user_id, title, description, category, priority, subtasks, type, completed, scheduled_date, expires_at, lifecycle_status (active/missed/rolled_over/abandoned), rollover_prompt_pending, source_goal_id, started_at, completed_at, missed_at, rolled_over_at, abandoned_at.
  - `goal_activity_logs`: id, user_id, event_type (CREATED/COMPLETED/ABANDONED/ROLLED_OVER), goal_id, goal_type, timestamp, day_of_week, hour_of_day.
  - `streaks`: user_id, login_streak, check_in_streak, goal_completion_streak, last_login_date, last_check_in_date, last_goal_completion_date, last_active_date.
  - `moods`: id, user_id, mood, intensity, notes, timestamp.
  - `mood_snapshots`: id, user_id, mood_score, pre_study_mood, post_study_mood, timestamp, date_key, source.
  - `journal`: id, user_id, content, timestamp.
  - `focus_sessions`: id, user_id, duration_minutes, break_minutes, completed, associated_goal_id, interrupted, started_at, completed_at.
  - `focus_session_logs`: id, user_id, duration_minutes, associated_goal_id, interrupted, completed, timestamp, date_key.
  - `focus_overlay_state`: user_id, state object (Pomodoro management).
  - `focus_overlay_sessions`: user_id, session_id.
  - `section_activity`, `daily_aggregates`, `monthly_reports`.
  - `perk_definitions`: id, name, description, type (aura/echo), category, rarity, tier, color_code, criteria_json, display_priority.
  - `user_perks`: id, user_id, perk_id, acquired_at, is_active, lost_at.
  - `achievement_definitions`: id, name, description, type (badge/title), category, rarity, tier, criteria_json, display_priority.
  - `user_achievements`: id, user_id, achievement_id, is_active, acquired_at.
  - `mehfil_thoughts`, `mehfil_reactions`, `mehfil_comments`, `mehfil_saves`, `mehfil_reports`, `mehfil_shares`, `mehfil_friendships`.
  - `orders`, `payments`, `refunds`, `course_enrollments`, `transaction_logs` (Payments system).
  - `uploaded_images`: id, user_id, data (Base64 Buffer), mime_type, size_bytes.
  - `app_settings`: key-value store.
  - `sandesh_messages`: id, content, importance, link_meta, image_url, audio_url, author_id, created_at.
  - `sandesh_reactions`: id, sandesh_id, user_id, created_at.
  - `sandesh_comments`: id, sandesh_id, user_id, content, created_at.
  - `user_social_handles`: user_id, linkedin, instagram, discord.
- **Relationships:** Maintained manually via `user_id`, `thought_id`, `perk_id`, `achievement_id`, `razorpay_order_id`, etc. No strict foreign key constraints (MongoDB).
- **Important logic constraints:** Unique indexes on emails, streaks, perk assignments, achievement assignments, friendships, Razorpay IDs, session IDs.
- **Soft delete or hard delete?** Mostly hard delete. Exceptions: achievements/perks have `is_active` flag, goals use `lifecycle_status`.
- **Indexing?** Extensive compound and unique index setup in `server/db.ts` for performance and constraint enforcement.

------------------------------------------------------------
6️⃣ PAYMENT SYSTEM ANALYSIS
------------------------------------------------------------
- **Payment provider detected?** Razorpay.
- **Secret key location?** `.env` (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`).
- **Client-side or server-side verification?** Both. Client side verifies via `/api/payments/verify`, and Server side verifies asynchronously via `/api/payments/webhook`.
- **Webhooks?** Yes, listens for `payment.captured`.
- **Signature verification?** Yes, implemented securely using `crypto.createHmac()`.
- **Mobile compatibility issues?** Razorpay provides a native Android SDK. The Android app will need to call `/create-order`, pass the `order_id` to the Razorpay Android SDK, and then send the success response metadata to `/verify`.

------------------------------------------------------------
7️⃣ FILE & MEDIA HANDLING
------------------------------------------------------------
- **Upload endpoints?** `POST /api/upload/avatar`, `POST /api/upload`
- **Storage type (local/cloud)?** Mixed: primary flow stores processed files and saves URL paths; legacy fallback stores Base64 payloads in MongoDB.
- **File validation?** Yes, limits array of mimeTypes (images and audio). Max size 5MB.
- **Image optimization?** Yes in primary multipart flow (processed before persistence). Legacy Base64 flow stores raw payload.
- **Signed URLs?** No. Files publicly accessible via `/api/images/:id`.
- **Audio support?** Yes — Sandesh announcements support `audio_url` for voice notes.
- **Mobile requirements:** Prefer multipart upload (`POST /api/upload/avatar` for avatars, `POST /api/upload` for general files). Legacy Base64 JSON upload is still supported for backward compatibility.

------------------------------------------------------------
8️⃣ REAL-TIME FEATURES
------------------------------------------------------------
- **WebSockets?** Yes, using `socket.io` with Redis adapter for multi-instance scaling.
- **Firebase?** Included in `package.json` (`firebase-admin`) but core real-time features utilize Socket.io.
- **Live updates?** Yes, the "Mehfil" social feed relies on Socket.io namespaces (`/mehfil`) for live posts, reactions, classifications, and moderation.
- **DM Presence:** In-memory online/offline tracking via `dm-presence.ts` for user online status.
- **Required mobile handling?** Android app MUST integrate the `socket.io-client-java` library to subscribe to `/mehfil` rooms, handle `register`, `newThought`, `thoughtCreated`, and moderation failure events (`thoughtRejected`).

------------------------------------------------------------
9️⃣ SECURITY AUDIT
------------------------------------------------------------
- **Rate limiting?** Yes, global `/api/` limiter: 100 requests/minute. Auth routes (forgot-password: 5/15min, reset-confirm: 10/15min) have stricter limiters.
- **Input validation?** Mostly manual in handlers. Content filtering on Mehfil and Sandesh via `contentFilter.ts` utility (blocked words).
- **Authentication middleware?** `requireAuth` verifies Bearer access token and blocklist status, then sets `req.user` (also keeps a compatibility `req.session.userId` shim).
- **Role-based access?** Admin access via `ADMIN_EMAILS` environment variable (email whitelist). Shadow banning and progressive ban system for Mehfil.
- **Exposed secrets?** None visible in source control.
- **CORS configuration?** Enabled (`origin: true`, `credentials: true`), permissive.
- **CSRF?** Code exists but is paused/commented out.
- **Email domain restriction?** Signup restricted to Gmail and Outlook only.

------------------------------------------------------------
🔟 FRONTEND FEATURES SUMMARY
------------------------------------------------------------
The website includes these pages/features that the Android app should replicate:

| Page | File | Description |
|------|------|-------------|
| **Landing** | `Landing.tsx` | Public homepage with app introduction |
| **Login** | `Login.tsx` | Email/password login form |
| **Signup** | `Signup.tsx` | Registration with exam type, gender, profile image |
| **Forgot Password** | `ForgotPassword.tsx` | Password reset flow |
| **Dashboard** | `Dashboard.tsx` | Main dashboard with streaks, goals overview, mood status |
| **Check-In** | `CheckIn.tsx` | Daily mood check-in with mood selection, intensity slider, notes |
| **Goals** | `Goals.tsx` | Full goal management — create, edit, complete, delete, subtasks, categories, priorities, scheduling, rollover prompts, repeat plans |
| **Journal** | `Journal.tsx` | Personal journaling with text entries |
| **Study With Me** | `StudyWithMe.tsx` | Focus/Pomodoro timer with session logging, goal association, pre/post study mood tracking |
| **Focus Analytics** | `FocusAnalytics.tsx` | Detailed focus statistics — weekly charts, hourly distribution, streaks |
| **Meditation** | `Meditation.tsx` | Guided breathing exercises (4-7-8, Box, etc.) with animated visualizations |
| **Analytics** | `Analytics.tsx` | Monthly report with executive summary, insights, radar chart, activity heatmap |
| **Mehfil** | `Mehfil.tsx` | Real-time social community feed with posts, reactions, comments, saves, reports |
| **Achievements** | `Achievements.tsx` | Badges and titles showcase with progress tracking |
| **Suggestions** | `Suggestions.tsx` | Personalized mood-based recommendations, SOS exercises, daily challenges, sleep wind-down |
| **Streaks** | `Streaks.tsx` | Streak tracking and visualization |
| **Profile** | `Profile.tsx` | User profile editing with avatar, exam type, achievements/perks display |
| **Tasks Sidebar** | `TasksSidebar.tsx` | Quick-access task panel |

**Additional UI Features:**
- **Internationalization (i18n):** Hindi/English language toggle (`locales/` directory, `i18n.ts`).
- **Theme Toggle:** Dark/light mode (`theme-toggle.tsx`).
- **Top Navbar:** Navigation with user avatar, streak display, achievement title.
- **Left Sidebar:** Feature navigation with colloquial Hindi labels.
- **Tutorial/Guided Tour:** Onboarding dialogs (`TutorialDialog.tsx`, `WelcomeDialog.tsx`, `guided-tour/`).
- **Celebration Modal:** Animated celebrations for achievements (`CelebrationModal.tsx`).
- **Perk Title Display:** Shows user's selected perk/aura next to their name (`PerkTitle.tsx`).
- **Content Moderation:** Blocked words filter, shadow banning, progressive banning in Mehfil.

------------------------------------------------------------
1️⃣1️⃣ MOBILE READINESS REPORT
------------------------------------------------------------
**Evaluate:**
- **Is backend mobile-ready?** Partially. JWT auth is mobile-friendlier now, but refresh-cookie + token rotation must be implemented correctly in the app; legacy Base64 uploads still exist for compatibility.
- **Are APIs consistent?** Yes, standard JSON responses.
- **Is pagination implemented?** Basic (skip/limit in WebSockets and REST).
- **Is error handling standardized?** Response structures occasionally differ (sometimes `{ message: string }`, sometimes `{ success: false, message: string }`).
- **What changes are required for Android integration?**
  1. Implement Bearer token lifecycle (store short-lived access token, refresh on 401 via `/api/auth/refresh`).
  2. Keep persistent cookie handling for refresh token cookie (`__Host-rt`) via Retrofit/OkHttp `CookieJar`.
  3. Integration of Socket.io client (`socket.io-client-java`) for real-time Mehfil feeds.
  4. Implement local notifications for streaks, achievements, daily challenges.
  5. Offline caching strategy for goals, journal entries, and mood check-ins.

------------------------------------------------------------
1️⃣2️⃣ ANDROID DEVELOPMENT HANDOVER DOCUMENT
------------------------------------------------------------
- **Base API URL:** Target deployment URL (e.g., `https://api.yourdomain.com`).
- **Auth method:** JWT Access Token + HTTP-only Refresh Cookie.
- **Token handling rules:**
  1. On `POST /api/auth/login` or `POST /api/auth/signup`, store `accessToken` from response body.
  2. Attach `Authorization: Bearer <accessToken>` to all protected requests.
  3. Persist refresh cookie (`__Host-rt`) with an OkHttp `CookieJar`.
  4. On 401, call `POST /api/auth/refresh` (with cookie), replace access token, then retry the failed request once.
  5. On refresh failure, force logout and clear local auth state.
- **Required headers:** `Content-Type: application/json` for REST + `Authorization: Bearer <accessToken>` for protected routes.
- **File upload method:** Prefer multipart/form-data (`avatar` on `/api/upload/avatar`, `file` on `/api/upload`). Legacy Base64 JSON upload on `/api/upload` remains supported.
- **Payment integration flow:**
  1. Call `POST /api/payments/create-order`
  2. Launch Razorpay Native Android SDK using `order.id` and `amount`
  3. On SDK Success Callback, send `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature` to `POST /api/payments/verify`.
- **Real-Time Integration:** Use `socket.io-client` connecting to namespace `YOUR_URL/mehfil`. Emits required: `register`, `joinRoom`. Listeners required: `onlineCount`, `thoughts`, `thoughtCreated`, `thoughtRejected`.
- **Achievements/Perks:** Fetch user achievements via `GET /api/achievements` and `GET /api/achievements/all`. Perks system provides auras/echoes with color codes. Display selected title/perk next to username.
- **Suggestions System:** Call `GET /api/suggestions/personalized` to get mood-based recommendations, SOS exercises, daily challenges, sleep wind-down. Display contextually based on time and mood.
- **Sandesh Announcements:** Fetch via `GET /api/mehfil/sandesh`. Display as notification cards. Support reactions and comments.
- **Social Handles:** Users can set LinkedIn, Instagram, Discord handles via `POST /api/dm/handles`.
- **Monthly Analytics:** Generate via `POST /api/analytics/monthly-report/generate`, fetch via `GET /api/analytics/monthly-report?month=YYYY-MM`. Display radar chart, heatmap, and insights.
- **Goal Management:** Support subtasks, categories (academic/health/personal/other), priorities (high/medium/low), scheduling (up to 7 days), rollover prompts for missed goals, and repeat-plan for carrying over previous goals.
- **i18n:** Support Hindi and English with the same translation keys used in `client/locales/`.

------------------------------------------------------------
1️⃣3️⃣ MISSING COMPONENTS (Required Backend Refactors for Mobile)
------------------------------------------------------------
- **Missing APIs:** No OAuth endpoints (Google/Apple login). No endpoint to fetch mobile app minimum version requirements. No push notification registration endpoint.
- **Missing auth improvements:** No dedicated mobile token introspection/session-info endpoint and no device-scoped refresh management API (current rotation is family-based).
- **Perks route mounting:** Verify that `/api/perks` routes are explicitly mounted in production (`index.ts` seeds definitions but may not mount the router — needs confirmation).
- **Security concerns:** Base64 uploading of 5MB files in JSON is highly inefficient for mobile networks and server RAM; should refactor to use Multipart/Form-Data and cloud storage like AWS S3 or Cloudinary.
- **Performance concerns:** Raw database operations without careful projection limits could result in over-fetching. Database image storage will eventually bloat the MongoDB instance.
- **Push notifications:** No Firebase Cloud Messaging (FCM) integration for mobile push notifications (streak reminders, achievement unlocks, Sandesh announcements).
- **Offline sync:** No offline queue mechanism — mobile should implement local-first with sync.
