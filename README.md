# SAFAR

Full-stack React + Express app for wellness, focus, community (Mehfil), and meditation payments.  
One Node service serves SPA assets, API routes, and Socket.IO.

## Tech Stack

- Frontend: React 18, React Router, TypeScript, Vite, TailwindCSS
- Backend: Express 5
- Realtime: Socket.IO (`/mehfil` namespace)
- DB: MongoDB (`mongodb`)
- Sessions/Scale: `express-session` + optional Redis (`connect-redis`, Socket.IO Redis adapter)
- State/Data: Zustand, TanStack Query
- i18n: i18next (`en`, `hi`)
- Payments: Razorpay

## Project Structure

```txt
client/      SPA pages, UI components, stores, i18n, utils
server/      Express app, route modules, Socket.IO handlers, DB bootstrap
shared/      Shared types/contracts (ex: payment types)
dist/        Build output (generated)
```

## Local Development

### Install

```bash
npm install
```

### Environment

Copy `.env.example` to `.env` and set at least:

- `MONGODB_URI` (required)
- `SESSION_SECRET` (required in production)

Common optional settings:

- `MONGODB_DB_NAME` (default: `safar`)
- `REDIS_URL` / `REDIS_REQUIRED`
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- `GROQ_API_KEY` (Mehfil AI moderation)
- `GMAIL_USER`, `GMAIL_APP_PASSWORD` (password reset emails)
- `ADMIN_EMAILS` (admin-only Mehfil actions)

Notes:

- Env loading order is `.env` first, then `.env_open`.
- If Redis is not configured, server falls back to memory session store.

### Run

```bash
npm run dev
```

- App/API on `http://localhost:8080`
- API base: `http://localhost:8080/api`
- Socket.IO path: `/socket.io`, namespace: `/mehfil`

## Build and Run (Production)

```bash
npm run build
npm run start
```

- Client build output: `dist/spa`
- Server build output: `dist/server`
- Runtime entry: `node dist/server/node-build.mjs`

## Frontend Routes (Current)

Public routes:

- `/`
- `/home`
- `/login`
- `/signup`
- `/forgot-password`
- `/reset-password`

Protected routes:

- `/dashboard`
- `/nishtha/check-in`
- `/nishtha/journal`
- `/nishtha/goals`
- `/nishtha/streaks`
- `/nishtha/suggestions`
- `/nishtha/analytics`
- `/study`
- `/study/analytics`
- `/achievements`
- `/profile`
- `/mehfil`
- `/meditation`

## API Overview

Registered base routes in `server/index.ts`:

- `/api/auth/*`
- `/api/moods/*`
- `/api/journal/*`
- `/api/goals/*`
- `/api/streaks/*`
- `/api/focus-sessions/*`
- `/api/focus-overlay/*`
- `/api/achievements/*`
- `/api/analytics/*`
- `/api/suggestions/*`
- `/api/payments/*`
- `/api/upload/*` and `/api/images/:id`
- `/api/mehfil/interactions/*`
- `/api/mehfil/sandesh/*`
- `/api/mehfil/*` (friends, saved posts, analytics, meditation video setting)
- `/api/dm/*` (DM status + social handles)
- `GET /api/ping`
- `GET /api/demo`

## Realtime (Mehfil + DM)

Socket handlers are in `server/routes/mehfil-socket.ts` and include:

- Mehfil feed rooms (`ACADEMIC`, `REFLECTIVE`, `ALL`)
- Thought create/edit/delete/react flows
- Auto moderation + routing + strike/shadow-ban flow
- DM request/accept/decline, room chat, handle sharing, and leave events
- Online status tracking and optional Redis-backed multi-instance support

## Scripts

```bash
npm run dev
npm run build
npm run build:client
npm run build:server
npm run start
npm run typecheck
npm run test
npm run format.fix
npm run backfill:mehfil
```
