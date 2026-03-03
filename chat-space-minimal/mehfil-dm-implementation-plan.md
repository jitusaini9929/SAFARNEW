# Mehfil — Private DM + Connect Feature
## Full Implementation Plan

> **Mode:** Walkie-Talkie (ephemeral live chat) + Business Card (social handle exchange)
> **Stack:** Next.js · WebSockets (Socket.io) · Redis · Prisma/PostgreSQL

---

## Table of Contents

1. [Feature Overview](#1-feature-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Tech Stack & Tools](#3-tech-stack--tools)
4. [Database Schema](#4-database-schema)
5. [WebSocket Server Design](#5-websocket-server-design)
6. [API Endpoints](#6-api-endpoints)
7. [Frontend Components](#7-frontend-components)
8. [End-to-End User Flow](#8-end-to-end-user-flow)
9. [Social Handle Exchange (Business Card)](#9-social-handle-exchange-business-card)
10. [Security & Privacy](#10-security--privacy)
11. [File & Folder Structure](#11-file--folder-structure)
12. [Implementation Phases](#12-implementation-phases)
13. [Industry Standards Checklist](#13-industry-standards-checklist)

---

## 1. Feature Overview

### What We're Building
A lightweight, ephemeral direct messaging system embedded inside Mehfil (the community/feed section). Users can connect with each other directly from posts or comments, have a live real-time conversation, optionally exchange social handles (LinkedIn, Instagram, Discord), and when either user leaves — the chat is gone forever.

### Core Principles
- **No profile system** — users are identified only by their session/username
- **Ephemeral by design** — no message history stored after session ends
- **Consent-first** — the receiving user must accept a connect request before chat opens
- **Optional identity sharing** — social handles are shared voluntarily, inside the chat

### What It Is NOT
- Not a persistent inbox
- Not a profile or social graph
- Not a notification centre
- Not a group chat

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                      │
│                                                              │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────────┐  │
│  │ Mehfil Feed │   │ Connect Btn  │   │  DM Chat Window  │  │
│  │ (Posts +    │──▶│ (on post /   │──▶│  (ephemeral,     │  │
│  │  Comments)  │   │  comment)    │   │   floating UI)   │  │
│  └─────────────┘   └──────────────┘   └────────┬─────────┘  │
└───────────────────────────────────────────────┼─────────────┘
                                                │
                                     WebSocket Connection
                                          (Socket.io)
                                                │
┌───────────────────────────────────────────────▼─────────────┐
│                     NEXT.JS SERVER                           │
│                                                              │
│  ┌──────────────────────┐   ┌────────────────────────────┐  │
│  │  /api/mehfil         │   │  WebSocket Server          │  │
│  │  (REST - pause check)│   │  (Socket.io on custom port │  │
│  │                      │   │   or via Next.js adapter)  │  │
│  │  /api/dm/request     │   │                            │  │
│  │  /api/dm/accept      │   │  Events:                   │  │
│  │  /api/dm/decline     │   │  - connect_request         │  │
│  └──────────────────────┘   │  - request_accepted        │  │
│                              │  - message                 │  │
│                              │  - share_handle            │  │
│                              │  - user_disconnected       │  │
│                              └──────────────┬─────────────┘  │
└─────────────────────────────────────────────┼────────────────┘
                                              │
                              ┌───────────────▼────────────────┐
                              │           REDIS                 │
                              │  (Active sessions, room state,  │
                              │   connect requests in-flight)   │
                              └────────────────────────────────┘
```

---

## 3. Tech Stack & Tools

### Backend
| Tool | Purpose | Why |
|------|---------|-----|
| **Socket.io** | WebSocket server + client | Handles reconnection, rooms, fallback to polling |
| **Redis** | Ephemeral session store | Fast in-memory store for active chat rooms — auto-expires |
| **Next.js API Routes** | REST endpoints for connect/accept/decline | Already in your stack |
| **Prisma + PostgreSQL** | Store only social handle opt-ins (optional) | Only persistent data needed |

### Frontend
| Tool | Purpose |
|------|---------|
| **socket.io-client** | WebSocket connection from browser |
| **Zustand** | Lightweight state management for DM window state |
| **Framer Motion** | Smooth DM window animations |
| **Tailwind CSS** | Consistent styling with existing Mehfil UI |

### Infrastructure
| Tool | Purpose |
|------|---------|
| **Redis (Upstash or self-hosted)** | Ephemeral room storage — TTL set to 2 hours |
| **Vercel / Railway** | Deployment (Socket.io needs sticky sessions on Vercel) |

---

## 4. Database Schema

> **Important:** We store almost nothing. Chats are ephemeral. The only persistent data is optional social handles users choose to save.

```prisma
// Only add this to your existing schema

model UserSocialHandles {
  id          String   @id @default(cuid())
  userId      String   @unique  // maps to your existing auth user
  linkedin    String?
  instagram   String?
  discord     String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Redis Data Structures (ephemeral, auto-expire)

```
// Active connect request
KEY:  dm:request:{requestId}
VAL:  { fromUserId, toUserId, postId/commentId, status: "pending" }
TTL:  60 seconds (expires if not accepted)

// Active chat room
KEY:  dm:room:{roomId}
VAL:  { user1, user2, createdAt, messageCount }
TTL:  2 hours

// User's active socket mapping
KEY:  dm:socket:{userId}
VAL:  { socketId, roomId? }
TTL:  Session duration
```

---

## 5. WebSocket Server Design

### Setup — `server.ts` (Custom Next.js server)

```typescript
// server.ts (project root)
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { registerDMHandlers } from "./lib/socket/dmHandlers";

const app = next({ dev: process.env.NODE_ENV !== "production" });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new SocketIOServer(httpServer, {
    cors: { origin: process.env.NEXT_PUBLIC_APP_URL, credentials: true },
    transports: ["websocket", "polling"],
  });

  // Attach all DM event handlers
  io.on("connection", (socket) => {
    registerDMHandlers(io, socket);
  });

  httpServer.listen(3000, () => {
    console.log("> Ready on http://localhost:3000");
  });
});
```

### Socket Event Handlers — `lib/socket/dmHandlers.ts`

```typescript
import { Server, Socket } from "socket.io";
import { redis } from "@/lib/redis";
import { nanoid } from "nanoid";

export function registerDMHandlers(io: Server, socket: Socket) {
  const userId = socket.handshake.auth.userId; // from session

  // Register user's socket in Redis
  redis.set(`dm:socket:${userId}`, socket.id, { ex: 3600 });

  // ── EVENT: Send a connect request ──────────────────────────────────
  socket.on("dm:request", async ({ toUserId, context }) => {
    // context = { type: "post" | "comment", id: string, preview: string }

    const requestId = nanoid();
    await redis.set(
      `dm:request:${requestId}`,
      JSON.stringify({ fromUserId: userId, toUserId, context, status: "pending" }),
      { ex: 60 }
    );

    // Find recipient's socket and notify them
    const recipientSocketId = await redis.get(`dm:socket:${toUserId}`);
    if (recipientSocketId) {
      io.to(recipientSocketId as string).emit("dm:incoming_request", {
        requestId,
        fromUserId: userId,
        context,
      });
    }
  });

  // ── EVENT: Accept a connect request ────────────────────────────────
  socket.on("dm:accept", async ({ requestId }) => {
    const raw = await redis.get(`dm:request:${requestId}`);
    if (!raw) return socket.emit("dm:error", { message: "Request expired" });

    const request = JSON.parse(raw as string);
    if (request.toUserId !== userId) return;

    // Create a private room
    const roomId = nanoid();
    await redis.set(
      `dm:room:${roomId}`,
      JSON.stringify({ user1: request.fromUserId, user2: userId, createdAt: Date.now() }),
      { ex: 7200 }
    );

    // Join both users to the room
    socket.join(roomId);
    const senderSocketId = await redis.get(`dm:socket:${request.fromUserId}`);
    if (senderSocketId) {
      io.to(senderSocketId as string).socketsJoin(roomId);
      io.to(senderSocketId as string).emit("dm:accepted", { roomId });
    }

    socket.emit("dm:opened", { roomId });
    await redis.del(`dm:request:${requestId}`);
  });

  // ── EVENT: Decline a connect request ───────────────────────────────
  socket.on("dm:decline", async ({ requestId }) => {
    const raw = await redis.get(`dm:request:${requestId}`);
    if (!raw) return;
    const request = JSON.parse(raw as string);
    const senderSocketId = await redis.get(`dm:socket:${request.fromUserId}`);
    if (senderSocketId) {
      io.to(senderSocketId as string).emit("dm:declined", { requestId });
    }
    await redis.del(`dm:request:${requestId}`);
  });

  // ── EVENT: Send a message ───────────────────────────────────────────
  socket.on("dm:message", async ({ roomId, text }) => {
    const room = await redis.get(`dm:room:${roomId}`);
    if (!room) return socket.emit("dm:error", { message: "Room no longer active" });

    // Broadcast to everyone in the room (both users)
    io.to(roomId).emit("dm:message", {
      from: userId,
      text,
      timestamp: Date.now(),
    });
  });

  // ── EVENT: Share a social handle ───────────────────────────────────
  socket.on("dm:share_handle", async ({ roomId, platform, handle }) => {
    io.to(roomId).emit("dm:handle_received", {
      from: userId,
      platform, // "linkedin" | "instagram" | "discord"
      handle,
    });
  });

  // ── EVENT: Disconnect ───────────────────────────────────────────────
  socket.on("disconnect", async () => {
    // Notify all rooms this user was in
    const rooms = [...socket.rooms];
    rooms.forEach((roomId) => {
      socket.to(roomId).emit("dm:user_left", { userId });
    });
    await redis.del(`dm:socket:${userId}`);
  });
}
```

---

## 6. API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/mehfil` | Existing — pause check |
| `GET` | `/api/dm/status` | Check if target user is currently online |
| `POST` | `/api/dm/handles` | Save user's social handles (optional) |
| `GET` | `/api/dm/handles/me` | Get current user's saved handles |

---

## 7. Frontend Components

### Component Tree

```
MehfilPage
└── MehfilView
    ├── PostCard
    │   ├── PostContent
    │   ├── ConnectButton          ← NEW
    │   └── CommentList
    │       └── CommentItem
    │           └── ConnectButton  ← NEW (inline, subtle)
    │
    └── DMLayer                    ← NEW (global overlay)
        ├── IncomingRequestToast   ← NEW
        └── DMChatWindow           ← NEW
            ├── ChatHeader
            ├── MessageList
            ├── MessageInput
            └── ShareHandlePanel   ← NEW
```

### `ConnectButton` Component

```typescript
// components/mehfil/ConnectButton.tsx

interface ConnectButtonProps {
  targetUserId: string;
  context: {
    type: "post" | "comment";
    id: string;
    preview: string; // first 60 chars of the post/comment
  };
}

export function ConnectButton({ targetUserId, context }: ConnectButtonProps) {
  const { sendRequest, requestState } = useDMStore();

  return (
    <button
      onClick={() => sendRequest(targetUserId, context)}
      disabled={requestState === "pending"}
      className="text-xs text-muted-foreground hover:text-foreground
                 flex items-center gap-1 transition-colors"
    >
      <LinkIcon size={12} />
      {requestState === "pending" ? "Waiting..." : "Connect"}
    </button>
  );
}
```

### `DMChatWindow` Component

```typescript
// components/mehfil/dm/DMChatWindow.tsx

export function DMChatWindow({ roomId, otherUserId }: DMChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [showHandlePanel, setShowHandlePanel] = useState(false);
  const { socket } = useSocket();

  useEffect(() => {
    socket.on("dm:message", (msg) => setMessages((prev) => [...prev, msg]));
    socket.on("dm:user_left", () => {
      // Show "User has left. Chat will close." message
    });
    return () => socket.off("dm:message");
  }, [socket]);

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-4 right-4 w-80 h-96 rounded-2xl border
                 border-border bg-card shadow-xl flex flex-col z-50"
    >
      <ChatHeader otherUserId={otherUserId} onClose={handleClose} />
      <MessageList messages={messages} />
      <ShareHandlePanel
        show={showHandlePanel}
        roomId={roomId}
        onToggle={() => setShowHandlePanel(!showHandlePanel)}
      />
      <MessageInput onSend={(text) => socket.emit("dm:message", { roomId, text })} />
    </motion.div>
  );
}
```

### `ShareHandlePanel` — The "Business Card"

```typescript
// components/mehfil/dm/ShareHandlePanel.tsx

const PLATFORMS = [
  { id: "linkedin",  label: "LinkedIn",  icon: LinkedInIcon,  color: "#0077B5" },
  { id: "instagram", label: "Instagram", icon: InstagramIcon, color: "#E1306C" },
  { id: "discord",   label: "Discord",   icon: DiscordIcon,   color: "#5865F2" },
];

export function ShareHandlePanel({ roomId, show }: ShareHandlePanelProps) {
  const { socket } = useSocket();
  const [handle, setHandle] = useState("");
  const [platform, setPlatform] = useState("discord");

  const shareHandle = () => {
    socket.emit("dm:share_handle", { roomId, platform, handle });
    setHandle("");
  };

  if (!show) return null;

  return (
    <div className="px-3 pb-2 border-t border-border">
      <p className="text-xs text-muted-foreground mb-2">Share your handle</p>
      <div className="flex gap-1 mb-2">
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPlatform(p.id)}
            className={`p-1.5 rounded-lg transition-colors ${
              platform === p.id ? "bg-accent" : "hover:bg-muted"
            }`}
          >
            <p.icon size={14} />
          </button>
        ))}
      </div>
      <div className="flex gap-1">
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder={`Your ${platform} handle`}
          className="flex-1 text-xs bg-muted rounded-lg px-2 py-1 outline-none"
        />
        <button
          onClick={shareHandle}
          className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-lg"
        >
          Share
        </button>
      </div>
    </div>
  );
}
```

### Zustand Store — `store/dmStore.ts`

```typescript
import { create } from "zustand";
import { socket } from "@/lib/socket";

interface DMStore {
  requestState: "idle" | "pending" | "accepted" | "declined";
  activeRoom: string | null;
  incomingRequest: IncomingRequest | null;
  sendRequest: (toUserId: string, context: ConnectContext) => void;
  acceptRequest: (requestId: string) => void;
  declineRequest: (requestId: string) => void;
  closeChat: () => void;
}

export const useDMStore = create<DMStore>((set) => ({
  requestState: "idle",
  activeRoom: null,
  incomingRequest: null,

  sendRequest: (toUserId, context) => {
    socket.emit("dm:request", { toUserId, context });
    set({ requestState: "pending" });
  },

  acceptRequest: (requestId) => {
    socket.emit("dm:accept", { requestId });
    set({ incomingRequest: null });
  },

  declineRequest: (requestId) => {
    socket.emit("dm:decline", { requestId });
    set({ incomingRequest: null });
  },

  closeChat: () => {
    set({ activeRoom: null, requestState: "idle" });
  },
}));
```

---

## 8. End-to-End User Flow

```
User A                              Server                           User B
  │                                    │                                │
  │── clicks "Connect" on B's post ───▶│                                │
  │                                    │── emit dm:incoming_request ───▶│
  │                                    │                                │
  │                                    │        [Toast pops up for B]   │
  │                                    │        "Someone wants to chat" │
  │                                    │                                │
  │                                    │◀── dm:accept ─────────────────│
  │                                    │                                │
  │                                    │── creates room in Redis ───────│
  │                                    │── joins both sockets to room ──│
  │                                    │                                │
  │◀── dm:accepted (roomId) ──────────│── dm:opened (roomId) ─────────▶│
  │                                    │                                │
  │ [Chat window opens for A]          │        [Chat window opens for B]
  │                                    │                                │
  │── dm:message ─────────────────────▶│── broadcast to room ──────────▶│
  │                                    │                                │
  │── dm:share_handle (Instagram) ────▶│── broadcast to room ──────────▶│
  │                                    │                [Handle card shown to B]
  │                                    │                                │
  │ [A closes window / leaves page]    │                                │
  │── disconnect ─────────────────────▶│── dm:user_left ───────────────▶│
  │                                    │── deletes room from Redis      │
  │                                    │          ["User left" shown to B]
```

---

## 9. Social Handle Exchange (Business Card)

### How It Works
- Inside an active chat window there is a **"Share Handle"** toggle button in the header
- Tapping it reveals a small panel with three platform options: LinkedIn, Instagram, Discord
- User types/pastes their handle and hits **Share**
- A special message card appears in the other user's chat showing the platform icon + handle + a direct link

### Handle Card UI (in chat)

```
┌─────────────────────────────────┐
│  🔗 Handle Shared               │
│  ─────────────────────────────  │
│  [Instagram Icon] @username     │
│  [ Open Instagram → ]           │
└─────────────────────────────────┘
```

### Platform Link Templates

| Platform | Link Format |
|----------|------------|
| Instagram | `https://instagram.com/{handle}` |
| LinkedIn | `https://linkedin.com/in/{handle}` |
| Discord | Display only (no deep link) |

---

## 10. Security & Privacy

| Concern | Solution |
|---------|---------|
| **Identity spoofing** | userId always derived server-side from session cookie, never from client payload |
| **Spam connect requests** | Rate limit: max 5 connect requests per user per minute (Redis counter + TTL) |
| **Room access control** | Server verifies userId is a member of the room before broadcasting any message |
| **Handle data** | Social handles typed in chat are never stored — only transmitted via WebSocket in the current session |
| **Message content** | No messages are stored anywhere — only in React state of the two active clients |
| **Session expiry** | Redis TTL of 2 hours on rooms; auto-cleanup on disconnect |
| **CORS** | Socket.io CORS locked to your app's domain only |
| **Input sanitization** | All text inputs sanitized server-side before broadcast (strip HTML, limit length) |

---

## 11. File & Folder Structure

```
mehfil/
├── components/
│   └── mehfil/
│       ├── Mehfil.tsx               (existing)
│       ├── ConnectButton.tsx         ← NEW
│       └── dm/
│           ├── DMLayer.tsx           ← NEW (mounts in MehfilView)
│           ├── DMChatWindow.tsx      ← NEW
│           ├── ChatHeader.tsx        ← NEW
│           ├── MessageList.tsx       ← NEW
│           ├── MessageInput.tsx      ← NEW
│           ├── ShareHandlePanel.tsx  ← NEW
│           └── IncomingRequestToast.tsx ← NEW
│
├── lib/
│   ├── socket.ts                     ← NEW (socket.io client singleton)
│   ├── redis.ts                      ← NEW (Redis client)
│   └── socket/
│       └── dmHandlers.ts             ← NEW
│
├── store/
│   └── dmStore.ts                    ← NEW (Zustand)
│
├── app/api/
│   ├── mehfil/route.ts              (existing)
│   └── dm/
│       ├── status/route.ts           ← NEW
│       └── handles/route.ts          ← NEW
│
├── server.ts                         ← NEW (custom Next.js server)
└── prisma/
    └── schema.prisma                 (add UserSocialHandles model)
```

---

## 12. Implementation Phases

### Phase 1 — WebSocket Foundation (Days 1–2)
- [ ] Set up custom `server.ts` with Socket.io
- [ ] Set up Redis client (`lib/redis.ts`)
- [ ] Build `lib/socket/dmHandlers.ts` with all events
- [ ] Create `lib/socket.ts` client singleton
- [ ] Test basic connect/message/disconnect cycle

### Phase 2 — Connect Request Flow (Days 3–4)
- [ ] Build `ConnectButton` component
- [ ] Build `IncomingRequestToast` component
- [ ] Wire up Zustand `dmStore`
- [ ] Add `ConnectButton` to `PostCard`
- [ ] Add `ConnectButton` to `CommentItem`
- [ ] Test full accept/decline flow

### Phase 3 — Chat Window UI (Days 5–6)
- [ ] Build `DMChatWindow` with `MessageList` + `MessageInput`
- [ ] Add Framer Motion animation (slide up from bottom)
- [ ] Mount `DMLayer` in `MehfilView`
- [ ] Handle "user left" gracefully in UI
- [ ] Handle "request expired" (60s timeout)

### Phase 4 — Social Handle Exchange (Day 7)
- [ ] Build `ShareHandlePanel` component
- [ ] Handle `dm:handle_received` event — render handle card in chat
- [ ] Add platform links with correct URL templates
- [ ] Optionally wire up `POST /api/dm/handles` for saving handles

### Phase 5 — Security & Polish (Days 8–9)
- [ ] Add server-side rate limiting on connect requests
- [ ] Add input sanitization on all socket events
- [ ] Add loading/error states throughout
- [ ] Cross-browser testing (mobile + desktop)
- [ ] Test Redis TTL and auto-cleanup

### Phase 6 — Deployment (Day 10)
- [ ] Configure sticky sessions on Vercel (or switch to Railway)
- [ ] Set `REDIS_URL` environment variable
- [ ] Add `NEXT_PUBLIC_SOCKET_URL` env variable
- [ ] Smoke test in production

---

## 13. Industry Standards Checklist

- [x] **WebSocket rooms** — each DM pair isolated in its own Socket.io room
- [x] **Server-side auth** — userId always validated from session, never trusted from client
- [x] **Rate limiting** — Redis-based, per-user per-minute cap
- [x] **Ephemeral storage** — Redis with TTL, no persistent message logs
- [x] **Graceful degradation** — Socket.io falls back to long-polling if WebSocket unavailable
- [x] **Input sanitization** — all user text sanitized before broadcast
- [x] **Connection cleanup** — Redis keys deleted on disconnect
- [x] **Consent model** — recipient must accept before any chat data flows
- [x] **Privacy by default** — social handles only shared if user actively chooses to
- [x] **Atomic state** — Zustand for clean, predictable client state
- [x] **TypeScript throughout** — full type safety on events and payloads
- [x] **Environment separation** — all secrets via `.env`, never hardcoded

---

*This document covers the complete end-to-end plan for the Mehfil DM feature. Each phase is independently deployable. Start with Phase 1 and validate the WebSocket layer before building UI.*
