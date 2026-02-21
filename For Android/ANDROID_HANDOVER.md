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
  Assumed to be hosted on platforms like Render/Heroku/Vultr (due to `trust proxy` setting and `nixpacks.toml`/`railway.json` presence). Redis is expected for session management.

**Explanation of Frontend/Backend Communication:**
The React frontend communicates with the Express backend via REST API calls (typically prefixed with `/api/`). The frontend relies on session cookies (`nistha.sid`) sent via the `withCredentials: true` configuration in Axios/Fetch requests. There is also a real-time Socket.io connection used for community features ("Mehfil").

------------------------------------------------------------
2️⃣ BACKEND DETECTION
------------------------------------------------------------
- **Is there a backend server?** Yes.
- **Where is it located in the repo?** In the `server/` directory.
- **Is it REST or GraphQL?** REST.
- **Is it production-ready or mock?** Production-ready.
- **Are API routes defined?** Yes, comprehensively mapped out in `server/routes/`.
- **Are there controllers/services?** Logic is primarily housed directly within the route definitions in `server/routes/` rather than highly abstracted service layers.
- **Are environment variables used?** Yes (loaded via `dotenv` and custom `load-env.ts`).
- **Are secret keys exposed?** No, secrets like `SESSION_SECRET`, `RAZORPAY_KEY_SECRET`, `GMAIL_APP_PASSWORD`, `GROQ_API_KEY`, etc. are expected to be in `.env`.

------------------------------------------------------------
3️⃣ COMPLETE API EXTRACTION
------------------------------------------------------------

### **Authentication APIs**
- **POST `/api/auth/signup`** (Public) - Creates user. Body: `{ name, email, password, examType, preparationStage, gender, profileImage }`
- **POST `/api/auth/login`** (Public) - Authenticates. Body: `{ email, password, rememberMe }`. Response sets `nistha.sid` cookie.
- **POST `/api/auth/logout`** (Auth Req) - Destroys session.
- **POST `/api/auth/forgot-password`** (Public) - Sends reset email. Body: `{ email }`.
- **POST `/api/auth/reset-password/confirm`** (Public) - Confirms reset. Body: `{ token, newPassword }`.
- **GET `/api/auth/me`** (Auth Req) - Returns current user profile and streaks. Response: `{ user: {...}, streaks: {...} }`
- **PATCH `/api/auth/profile`** (Auth Req) - Updates user details. Body: `{ name, examType, ... }`

### **Payment APIs**
- **GET `/api/payments/courses`** (Public) - Lists available courses.
- **POST `/api/payments/create-order`** (Auth Req) - Creates a Razorpay order. Body: `{ courseId }`.
- **POST `/api/payments/verify`** (Auth Req) - Verifies client-side payment success. Body: `{ razorpay_order_id, razorpay_payment_id, razorpay_signature, courseId }`.
- **POST `/api/payments/webhook`** (Public) - Server-side webhook for `payment.captured` event. (Verifies signature via `x-razorpay-signature` header).
- **GET `/api/payments/status/:courseId`** (Auth Req) - Checks if user has access.
- **GET `/api/payments/history`** (Auth Req) - User's transaction history.
- **GET `/api/payments/enrollments`** (Auth Req) - User's active course enrollments.

### **Upload/Media APIs**
- **POST `/api/upload`** (Auth Req) - Uploads file. Body: `{ data: "<base64_string>", mimeType: "image/png" }`. Max 5MB. Stores directly in MongoDB.
- **GET `/api/images/:id`** (Public) - Serves uploaded image/audio as binary buffer.

### **Data CRUD APIs (Summary of other major routes)**
- **Goals (`/api/goals/*`)** - CRUD for goals, activity logs.
- **Streaks (`/api/streaks/*`)** - Fetch and update streaks.
- **Moods (`/api/moods/*`)** - CRUD for daily check-ins.
- **Journal (`/api/journal/*`)** - CRUD for journal entries.
- **Focus (`/api/focus-sessions/*`, `/api/focus-overlay/*`)** - Study timers, Pomodoro sessions tracking.
- **Analytics (`/api/analytics/*`)** - Aggregated user data.
- **Social / Mehfil (`/api/mehfil/*`)** - Social community feeds, interactions, reporting.

*If APIs are missing: For mobile specifically, token-based authentication (JWT) endpoints are missing and highly recommended, as cookie-based auth is harder to manage consistently across Android SDKs.*

------------------------------------------------------------
4️⃣ AUTHENTICATION ANALYSIS
------------------------------------------------------------
- **Session-based or JWT?** Session-based.
- **Token generation logic?** Managed entirely by `express-session` relying on Redis (or Memory Store).
- **Token expiry?** 30 days (if "Remember Me" true), otherwise 24 hours.
- **Refresh token present?** No, rolling sessions extend expiry automatically via `express-session` `rolling: true`.
- **Cookie-based auth?** Yes, depends heavily on the `nistha.sid` cookie.
- **OAuth/social login?** None detected in standard routes.
- **CSRF protection?** Implemented in backend, but **currently paused/commented out** due to UX issues.
- **Mobile compatibility issues?** **HIGH.** Cookie-based authentication is notoriously difficult to manage robustly in native Android apps (Retrofit/OkHttp). It requires explicit cookie jar management and passing `Cookie` headers manually. 

**Changes Required for Android:**
Ideally, the backend should be refactored to support JWTs sent via the `Authorization: Bearer <token>` header, alongside refresh tokens. If backend changes are forbidden, the Android networking layer (e.g., OkHttp) MUST implement a `CookieJar` to persist the `nistha.sid` session cookie across app restarts.

------------------------------------------------------------
5️⃣ DATABASE STRUCTURE
------------------------------------------------------------
- **Models/Entities (Collections):**
  - `users`: id, email, password_hash, name, avatar, exam_type, gender, is_shadow_banned, spam_strike_count, etc.
  - `password_reset_tokens`: id, user_id, token_hash, expires_at, used_at.
  - `goals`, `goal_activity_logs`, `streaks`, `moods`, `journal`
  - `focus_sessions`, `focus_session_logs`, `daily_aggregates`, `monthly_reports`
  - `orders`, `payments`, `refunds`, `course_enrollments`, `transaction_logs` (Payments system)
  - `mehfil_thoughts`, `mehfil_reactions`, `mehfil_comments` (Social features)
  - `uploaded_images`: id, user_id, data (Base64 string), mime_type, size_bytes (Base64 media storage).
- **Relationships:** Maintained manually via `user_id`, `thought_id`, `razorpay_order_id`, etc. No strict foreign key constraints exist since it's MongoDB.
- **Important logic constraints:** Unique indexes enforce uniqueness on emails, Razorpay order IDs, Session IDs.
- **Soft delete or hard delete?** Mostly hard delete.
- **Indexing?** Extensive index setup exists in `server/db.ts` for performance and uniqueness constraints.

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
- **Upload endpoints?** `POST /api/upload`
- **Storage type (local/cloud)?** Database (MongoDB Base64).
- **File validation?** Yes, limits array of mimeTypes (images and audio). Max size 5MB.
- **Image optimization?** None. Files are uploaded and stored exactly as they are received in Base64.
- **Signed URLs?** No. Files are publically accessible via `/api/images/:id` using standard Express routing. Mobile app must convert images to Base64 strings before uploading.

------------------------------------------------------------
8️⃣ REAL-TIME FEATURES
------------------------------------------------------------
- **WebSockets?** Yes, using `socket.io`.
- **Firebase?** Included in `package.json` (`firebase-admin`) but core real-time features utilize Socket.io.
- **Live updates?** Yes, the "Mehfil" social feed relies on Socket.io namespaces (`/mehfil`) for live posts, reactions, classifications, and shadow banning.
- **Required mobile handling?** Android app MUST integrate the `socket.io-client-java` library to subscribe to `/mehfil` rooms, handle `register`, `newThought`, `thoughtCreated`, and moderation failure events (`thoughtRejected`).

------------------------------------------------------------
9️⃣ SECURITY AUDIT
------------------------------------------------------------
- **Rate limiting?** Yes, global `/api/` limiter is set to 100 requests/minute. Auth routes (forgot-password, reset) have stricter separate limiters.
- **Input validation?** Mostly done manually in handlers. Some Zod might be used, but mostly explicit checks.
- **Authentication middleware?** `requireAuth` checks for `req.session.userId`.
- **Role-based access?** Implicit via admin emails for specific features, but mostly standard user roles. Mentions of shadow banning and spam strikes (`is_shadow_banned`).
- **Exposed secrets?** None visible in source control.
- **CORS configuration?** Enabled (`origin: true`, `credentials: true`), which is permissive.
- **CSRF?** Code exists but is paused.

------------------------------------------------------------
🔟 MOBILE READINESS REPORT
------------------------------------------------------------
**Evaluate:**
- **Is backend mobile-ready?** Partially. It functions, but relies heavily on web-centric patterns (Session Cookies, Base64 Image Uploads).
- **Are APIs consistent?** Yes, standard JSON responses.
- **Is pagination implemented?** Yes, but heavily rudimentary (e.g., skip/limit logic in WebSockets and REST). 
- **Is error handling standardized?** Response structures occasionally differ (sometimes `{ message: string }`, sometimes `{ success: false, message: string }`).
- **What changes are required for Android integration?**
  1. Deep management of Session Cookies in Retrofit.
  2. Implement Base64 string encoding for image uploads from the Android gallery/camera.
  3. Integration of Socket.io client for social feeds.

------------------------------------------------------------
1️⃣1️⃣ ANDROID DEVELOPMENT HANDOVER DOCUMENT
------------------------------------------------------------
- **Base API URL:** Target deployment URL (e.g., `https://api.yourdomain.com`).
- **Auth method:** Cookie-based Session.
- **Token handling rules:** Android HTTP Client (Retrofit/OkHttp) MUST use a persistent `CookieJar`. Upon login at `/api/auth/login`, intercept the `Set-Cookie` header and store `nistha.sid`. Attach this `Cookie` to every subsequent authenticated request.
- **Required headers:** `Content-Type: application/json` for REST.
- **File upload method:** Convert local `File`/`Bitmap` to a Base64 encoded string. Send JSON POST to `/api/upload` containing `{ "data": "base64_string", "mimeType": "image/jpeg" }`.
- **Payment integration flow:**
  1. Call `POST /api/payments/create-order`
  2. Launch Razorpay Native Android SDK using `order.id` and `amount`
  3. On SDK Success Callback, send `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature` to `POST /api/payments/verify`.
- **Real-Time Integration:** Use `socket.io-client` connecting to namespace `YOUR_URL/mehfil`. Emits required: `register`, `joinRoom`. Listeners required: `onlineCount`, `thoughts`, `thoughtCreated`, `thoughtRejected`.

------------------------------------------------------------
1️⃣2️⃣ MISSING COMPONENTS (Required Backend Refactors for Mobile)
------------------------------------------------------------
- **Missing APIs:** No OAuth endpoints (Google/Apple login). No endpoint to fetch mobile app minimum version requirements.
- **Missing auth improvements:** JWT Token issuance (to replace fragile cookie handling on mobile).
- **Security concerns:** Base64 uploading of 5MB files in JSON is highly inefficient for mobile networks and server RAM; should refactor to use Multipart/Form-Data and cloud storage like AWS S3 or Cloudinary.
- **Performance concerns:** Raw Database operations running on Node without careful projection limits could result in over-fetching. Database image storage will eventually bloat the MongoDB instance.
