# SAFAR (Fusion Starter)

Production-ready full-stack React SPA with an integrated Express server. The backend serves the built frontend, exposes a JSON API under `/api/*`, and provides Socket.IO real-time features.

## Tech Stack

- Frontend: React 18, React Router 6 (SPA), TypeScript, Vite, TailwindCSS 3
- Backend: Express (integrated with Vite dev server)
- Realtime: Socket.IO
- DB: PostgreSQL via `pg` (tested with Neon connection strings)
- Validation: Zod
- State: Zustand
- Testing: Vitest
- UI: Radix UI, Tailwind, Lucide icons

## Project Structure

```
client/              React SPA
  pages/             Route components
  components/        App components (includes ui/)
  contexts/          Theme provider and app contexts
  utils/             Frontend helpers (auth, etc.)

server/              Express API backend
  index.ts           Express app + routes + Socket.IO
  node-build.ts      Production entry (serves dist/spa + API + sockets)
  db.ts              Postgres connection + schema init
  routes/            API route modules

shared/              Shared types used by client/server

dist/                Build output (generated)
  spa/               Built SPA assets
  server/            Built server entry
```

## Local Development

This template runs frontend + backend on a single port during development.

### Install

```bash
pnpm install
```

### Environment Variables

Copy `.env.example` to `.env` and set the required values:

- `SESSION_SECRET` (required in production): random long secret for sessions
- `DATABASE_URL` (required): PostgreSQL connection string
- `PORT` (optional): dev/prod port override (AWS sets this automatically)
- `PING_MESSAGE` (optional): custom message for `/api/ping`

### Run (Dev)

```bash
pnpm dev
```

- Dev server listens on `http://localhost:8080`
- API is available at `http://localhost:8080/api/*`

## Production Build / Run

```bash
pnpm build
pnpm start
```

Notes:
- `pnpm build` builds the SPA to `dist/spa` and the server to `dist/server`.
- `pnpm start` runs `node dist/server/node-build.mjs`.
- In production, the server serves SPA assets and falls back to `dist/spa/index.html` for non-API routes (React Router SPA mode).
- The production server reads `process.env.PORT` (defaults to `3000`).

## Frontend Routes

Defined in `client/App.tsx` (SPA routing):

- Public:
  - `/` (Landing)
  - `/landing`
  - `/login`
  - `/signup`
  - `/forgot-password`
- Protected (requires session):
  - `/dashboard`
  - `/nishtha/check-in`
  - `/nishtha/journal`
  - `/nishtha/goals`
  - `/nishtha/streaks`
  - `/nishtha/suggestions`
  - `/study`
  - `/achievements`
  - `/profile`
  - `/mehfil`
  - `/meditation`
- `*` -> NotFound

## API Overview

The server registers these base paths in `server/index.ts`:

- `POST /api/auth/*` (signup/login/profile, etc.)
- `/api/moods/*`
- `/api/journal/*`
- `/api/goals/*`
- `/api/streaks/*`
- `/api/focus-sessions/*`
- `/api/achievements/*`
- `GET /api/ping` -> `{ message }`
- `GET /api/demo`

Socket.IO is mounted on the same server (default path `/socket.io`) and is initialized via `setupMehfilSocket()` in `server/routes/mehfil-socket.ts`.

## Database

On server startup, `initDatabase()` (in `server/db.ts`) creates tables if needed and seeds default data (topics, achievements). The app uses PostgreSQL via `pg` with `DATABASE_URL`.

## Sessions / Cookies

- Sessions are configured with `express-session` in `server/index.ts`.
- Default store is in-memory (MemoryStore). In production, run a single instance unless you add a shared store (Redis/DB-backed) to avoid logouts and inconsistent sessions.
- In production (`NODE_ENV=production`), cookies are `secure` and `sameSite=none`, so deploy behind HTTPS.

## Styling / Theme

- Tailwind is configured in `tailwind.config.ts` and theme tokens live in `client/global.css`.
- Theme toggling is provided via `ThemeProvider` in `client/contexts/ThemeContext` (wired in `client/main.tsx`).

## Scripts

From `package.json`:

```bash
pnpm dev         # Vite dev server (frontend + backend)
pnpm build       # Build SPA + server
pnpm start       # Run production server from dist/
pnpm typecheck   # tsc
pnpm test        # vitest --run
pnpm format.fix  # prettier --write .
```

## Deployment Notes (AWS)

This app is easiest to deploy as a single Node service (container or VM) because the backend serves the SPA and also hosts Socket.IO.

Minimum production settings:

- Set env vars: `NODE_ENV=production`, `SESSION_SECRET`, `DATABASE_URL`
- Configure health check to `GET /api/ping`
- Ensure WebSockets are supported (ALB + ECS/EB works well)
- Run a single instance unless you add a shared session store

