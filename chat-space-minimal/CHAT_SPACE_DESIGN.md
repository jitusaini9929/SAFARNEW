# Minimal Public Chat Space – Complete Design & Implementation

## Overview

**Goal**: Build a lightweight, public chat space embedded as a section in your existing website. Anyone can post thoughts, others can relate (poll), and messages can be flagged for moderation.

**Approach**: Minimal public chat with binary relatable polling system (no emojis, no dislikes). Real-time updates via Socket.IO. Frontend-only components; integrate with your Render backend + Turso database.

---

## Architecture & Design

### Section 1: Architecture & Database

**Frontend Stack:**
- React with TypeScript (.tsx)
- Socket.IO Client (real-time WebSocket)
- TailwindCSS (styling)
- Zustand or Context API (state management)

**Backend (Your Existing Render Deployment):**
- Node.js/Express
- Socket.IO server
- Turso (SQLite) database

**Data Model (Turso Schema):**

```sql
CREATE TABLE topics (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  message_count INT DEFAULT 0
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL,
  author TEXT DEFAULT 'Anonymous',
  text TEXT NOT NULL,
  image_url TEXT,
  relatable_count INT DEFAULT 0,
  flag_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (topic_id) REFERENCES topics(id)
);

CREATE TABLE polls (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  is_relatable BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(message_id, session_id),
  FOREIGN KEY (message_id) REFERENCES messages(id)
);

CREATE TABLE flags (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  reason TEXT,
  flag_count INT DEFAULT 1,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES messages(id)
);
```

**Key Design Choices:**
- **No authentication**: Anonymous posting with session tracking (IP + sessionId).
- **Rate limiting**: IP-based per backend (max 5 messages/minute, max 1 poll/second).
- **Character limit**: 280–1000 chars per message.
- **Polling system**: Binary "I relate" vote, one vote per session/IP. No dislike.
- **Flagging**: Users report messages; count displayed. Manual admin review.

---

### Section 2: Frontend Architecture & Real-Time Integration

**Socket.IO Events:**

*Client → Server:*
- `message:create` → { topicId, text, imageUrl }
- `poll:vote` → { messageId, sessionId }
- `message:flag` → { messageId, reason }
- `topic:load` → { topicId } (fetch initial messages)

*Server → Client:*
- `message:new` → broadcast new message to all clients
- `poll:updated` → broadcast updated relatable count
- `message:flagged` → notify admin panel (if open)
- `topic:messages` → initial load response

**State Management (Zustand Example):**

```typescript
// store/chatStore.ts
import { create } from 'zustand';

interface Message {
  id: string;
  topicId: string;
  author: string;
  text: string;
  imageUrl?: string;
  relatableCount: number;
  flagCount: number;
  createdAt: string;
}

interface Topic {
  id: string;
  name: string;
  description: string;
  messageCount: number;
}

interface ChatStore {
  topics: Topic[];
  messages: Message[];
  currentTopicId: string;
  sessionId: string;
  userVotes: Set<string>; // messageIds user has voted on
  setTopics: (topics: Topic[]) => void;
  setMessages: (messages: Message[]) => void;
  setCurrentTopic: (topicId: string) => void;
  addMessage: (message: Message) => void;
  updateRelatableCount: (messageId: string, count: number) => void;
  addUserVote: (messageId: string) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  topics: [],
  messages: [],
  currentTopicId: '',
  sessionId: typeof window !== 'undefined' ? sessionStorage.getItem('sessionId') || generateSessionId() : '',
  userVotes: new Set(),
  setTopics: (topics) => set({ topics }),
  setMessages: (messages) => set({ messages }),
  setCurrentTopic: (topicId) => set({ currentTopicId: topicId }),
  addMessage: (message) => set((state) => ({ messages: [message, ...state.messages] })),
  updateRelatableCount: (messageId, count) => set((state) => ({
    messages: state.messages.map((m) => m.id === messageId ? { ...m, relatableCount: count } : m),
  })),
  addUserVote: (messageId) => set((state) => ({
    userVotes: new Set([...state.userVotes, messageId]),
  })),
}));

function generateSessionId() {
  const id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('sessionId', id);
  }
  return id;
}
```

**Real-Time Flow:**
1. User types message → clicks Send → `message:create` event sent to backend.
2. Backend validates, saves to Turso, increments message_count on topic.
3. Backend broadcasts `message:new` to all connected clients.
4. All clients receive event → Zustand store updates → React re-renders.
5. User clicks "✨ Relate" → `poll:vote` event sent.
6. Backend checks if vote exists for (messageId, sessionId); if not, inserts poll record and increments relatable_count.
7. Backend broadcasts `poll:updated` with new count.
8. All clients update relatable_count in store → UI animates and shows new count.

---

### Section 3: UI/UX & Component Design

**Visual Layout:**
```
┌─────────────────────────────────────────┐
│  💭 Share Your Thoughts                 │
├─────────────────────────────────────────┤
│ [General] [Ideas] [Feedback]            │
├─────────────────────────────────────────┤
│                                         │
│  Anonymous • 2 min ago                  │
│  "This is a great space to share..."    │
│  ✨ 347 relate          🚩 Flag         │
│                                         │
├─────────────────────────────────────────┤
│ [Type your thought...] ▶ [Send]         │
│ 0/1000 chars                            │
└─────────────────────────────────────────┘
```

**Key UI Details:**
- **Sparkle button (✨)**: Gradient fill on hover, pulse animation on click, smooth count increment.
- **Message card**: Soft shadow, hover reveals flag button, timestamp relative ("2 min ago").
- **Composer**: Focus state with blue border, char counter warns at 80%, errors at 100%.
- **Color palette**: Light bg (#F9FAFB), dark text (#1F2937), primary accent for buttons, sparkle ✨ in primary.
- **Accessibility**: ARIA labels, semantic HTML, keyboard navigation, 4.5:1 contrast.

---

## Complete React TypeScript Components

### 1. ChatSpace.tsx (Main Container)

```typescript
// components/ChatSpace.tsx
import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useChatStore } from '../store/chatStore';
import TopicTabs from './TopicTabs';
import MessageList from './MessageList';
import Composer from './Composer';

interface ChatSpaceProps {
  backendUrl: string; // Your Render backend URL
}

const ChatSpace: React.FC<ChatSpaceProps> = ({ backendUrl }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const {
    topics,
    messages,
    currentTopicId,
    sessionId,
    setTopics,
    setMessages,
    setCurrentTopic,
    addMessage,
    updateRelatableCount,
  } = useChatStore();

  // Initialize Socket.IO connection
  useEffect(() => {
    const newSocket = io(backendUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      console.log('Connected to chat server');
      // Request initial topics
      newSocket.emit('topic:load');
    });

    newSocket.on('topic:list', (topicList) => {
      setTopics(topicList);
      if (topicList.length > 0 && !currentTopicId) {
        setCurrentTopic(topicList[0].id);
      }
    });

    newSocket.on('topic:messages', (messageList) => {
      setMessages(messageList);
    });

    newSocket.on('message:new', (message) => {
      addMessage(message);
    });

    newSocket.on('poll:updated', ({ messageId, relatableCount }) => {
      updateRelatableCount(messageId, relatableCount);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from chat server');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [setTopics, setMessages, setCurrentTopic, addMessage, updateRelatableCount, currentTopicId]);

  const handleTopicChange = (topicId: string) => {
    setCurrentTopic(topicId);
    if (socket) {
      socket.emit('topic:load', { topicId });
    }
  };

  const handleSendMessage = (text: string, imageUrl?: string) => {
    if (!socket || !currentTopicId) return;
    socket.emit('message:create', {
      topicId: currentTopicId,
      text,
      imageUrl,
      sessionId,
    });
  };

  const handleRelate = (messageId: string) => {
    if (!socket) return;
    socket.emit('poll:vote', { messageId, sessionId });
  };

  const handleFlag = (messageId: string, reason: string) => {
    if (!socket) return;
    socket.emit('message:flag', { messageId, reason, sessionId });
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg shadow-lg">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <span className="text-2xl">💭</span> Share Your Thoughts
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          A space to share your thoughts and connect with others
        </p>
      </div>

      {/* Topics */}
      {topics.length > 0 && (
        <TopicTabs
          topics={topics}
          currentTopicId={currentTopicId}
          onTopicChange={handleTopicChange}
        />
      )}

      {/* Messages */}
      <MessageList
        messages={messages.filter((m) => m.topicId === currentTopicId)}
        onRelate={handleRelate}
        onFlag={handleFlag}
      />

      {/* Composer */}
      <Composer onSendMessage={handleSendMessage} />
    </div>
  );
};

export default ChatSpace;
```

### 2. TopicTabs.tsx

```typescript
// components/TopicTabs.tsx
import React from 'react';

interface Topic {
  id: string;
  name: string;
  messageCount: number;
}

interface TopicTabsProps {
  topics: Topic[];
  currentTopicId: string;
  onTopicChange: (topicId: string) => void;
}

const TopicTabs: React.FC<TopicTabsProps> = ({
  topics,
  currentTopicId,
  onTopicChange,
}) => {
  return (
    <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
      {topics.map((topic) => (
        <button
          key={topic.id}
          onClick={() => onTopicChange(topic.id)}
          className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-all ${
            currentTopicId === topic.id
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-slate-700 border border-slate-300 hover:border-blue-400'
          }`}
          aria-label={`Switch to ${topic.name} topic`}
        >
          {topic.name}
          <span className="ml-2 text-xs opacity-75">({topic.messageCount})</span>
        </button>
      ))}
    </div>
  );
};

export default TopicTabs;
```

### 3. MessageList.tsx

```typescript
// components/MessageList.tsx
import React from 'react';
import MessageCard from './MessageCard';

interface Message {
  id: string;
  topicId: string;
  author: string;
  text: string;
  imageUrl?: string;
  relatableCount: number;
  flagCount: number;
  createdAt: string;
}

interface MessageListProps {
  messages: Message[];
  onRelate: (messageId: string) => void;
  onFlag: (messageId: string, reason: string) => void;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  onRelate,
  onFlag,
}) => {
  return (
    <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
      {messages.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <p>No messages yet. Be the first to share your thoughts!</p>
        </div>
      ) : (
        messages.map((message) => (
          <MessageCard
            key={message.id}
            message={message}
            onRelate={() => onRelate(message.id)}
            onFlag={(reason) => onFlag(message.id, reason)}
          />
        ))
      )}
    </div>
  );
};

export default MessageList;
```

### 4. MessageCard.tsx

```typescript
// components/MessageCard.tsx
import React, { useState } from 'react';
import RelateButton from './RelateButton';
import FlagModal from './FlagModal';

interface Message {
  id: string;
  author: string;
  text: string;
  imageUrl?: string;
  relatableCount: number;
  flagCount: number;
  createdAt: string;
}

interface MessageCardProps {
  message: Message;
  onRelate: () => void;
  onFlag: (reason: string) => void;
}

const MessageCard: React.FC<MessageCardProps> = ({
  message,
  onRelate,
  onFlag,
}) => {
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      <div
        className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Header: Author and Timestamp */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
              {message.author[0] || 'A'}
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">
                {message.author}
              </p>
              <p className="text-xs text-slate-500">{formatTime(message.createdAt)}</p>
            </div>
          </div>

          {/* Flag Button (appears on hover) */}
          {isHovered && (
            <button
              onClick={() => setShowFlagModal(true)}
              className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
              aria-label="Flag message"
              title="Report this message"
            >
              🚩
            </button>
          )}
        </div>

        {/* Message Text */}
        <p className="text-slate-700 mb-3 leading-relaxed">{message.text}</p>

        {/* Image (if present) */}
        {message.imageUrl && (
          <img
            src={message.imageUrl}
            alt="Message attachment"
            className="rounded-lg mb-3 max-w-full max-h-48 object-cover"
          />
        )}

        {/* Footer: Relate Button and Flag Count */}
        <div className="flex justify-between items-center">
          <RelateButton
            count={message.relatableCount}
            onRelate={onRelate}
          />
          {message.flagCount > 0 && (
            <p className="text-xs text-red-500">
              Flagged: {message.flagCount}x
            </p>
          )}
        </div>
      </div>

      {/* Flag Modal */}
      {showFlagModal && (
        <FlagModal
          onClose={() => setShowFlagModal(false)}
          onSubmit={(reason) => {
            onFlag(reason);
            setShowFlagModal(false);
          }}
        />
      )}
    </>
  );
};

export default MessageCard;
```

### 5. RelateButton.tsx

```typescript
// components/RelateButton.tsx
import React, { useState, useEffect } from 'react';

interface RelateButtonProps {
  count: number;
  onRelate: () => void;
}

const RelateButton: React.FC<RelateButtonProps> = ({ count, onRelate }) => {
  const [isClicked, setIsClicked] = useState(false);
  const [displayCount, setDisplayCount] = useState(count);

  useEffect(() => {
    setDisplayCount(count);
  }, [count]);

  const handleClick = () => {
    if (!isClicked) {
      setIsClicked(true);
      setDisplayCount((prev) => prev + 1);
      onRelate();

      // Reset animation after 600ms
      setTimeout(() => setIsClicked(false), 600);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isClicked}
      className={`flex items-center gap-2 px-3 py-2 rounded-full font-medium text-sm transition-all transform ${
        isClicked
          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white scale-110'
          : 'bg-gradient-to-r from-blue-100 to-purple-100 text-slate-700 hover:from-blue-200 hover:to-purple-200 hover:scale-105'
      }`}
      aria-label={`Relate to this message. ${displayCount} people relate.`}
      title={`${displayCount} people relate to this`}
    >
      <span className={`text-lg transition-transform ${isClicked ? 'animate-pulse' : ''}`}>
        ✨
      </span>
      <span>{displayCount} relate</span>
    </button>
  );
};

export default RelateButton;
```

### 6. Composer.tsx

```typescript
// components/Composer.tsx
import React, { useState } from 'react';

interface ComposerProps {
  onSendMessage: (text: string, imageUrl?: string) => void;
}

const MAX_CHARS = 1000;

const Composer: React.FC<ComposerProps> = ({ onSendMessage }) => {
  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const charCount = text.length;
  const isOverLimit = charCount > MAX_CHARS;
  const isNearLimit = charCount > MAX_CHARS * 0.8;
  const canSubmit = charCount > 0 && !isOverLimit;

  const handleSend = () => {
    if (!canSubmit) return;
    onSendMessage(text, imageUrl || undefined);
    setText('');
    setImageUrl('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Cmd/Ctrl + Enter
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canSubmit) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="space-y-3">
        {/* Textarea */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="Type your thought..."
          className={`w-full p-3 border-2 rounded-lg resize-none focus:outline-none transition-colors ${
            isFocused ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
          }`}
          rows={3}
          aria-label="Share your thought"
        />

        {/* Image URL Input (optional) */}
        <input
          type="text"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="Image URL (optional)"
          className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          aria-label="Image URL"
        />

        {/* Footer: Char Counter and Send Button */}
        <div className="flex justify-between items-center">
          <p
            className={`text-sm font-medium ${
              isOverLimit
                ? 'text-red-600'
                : isNearLimit
                ? 'text-orange-500'
                : 'text-slate-500'
            }`}
          >
            {charCount} / {MAX_CHARS}
          </p>
          <button
            onClick={handleSend}
            disabled={!canSubmit}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              canSubmit
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:shadow-lg'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
            aria-label="Send message"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default Composer;
```

### 7. FlagModal.tsx

```typescript
// components/FlagModal.tsx
import React, { useState } from 'react';

interface FlagModalProps {
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

const FLAG_REASONS = [
  'Spam',
  'Inappropriate content',
  'Harassment',
  'Misinformation',
  'Other',
];

const FlagModal: React.FC<FlagModalProps> = ({ onClose, onSubmit }) => {
  const [selectedReason, setSelectedReason] = useState('');

  const handleSubmit = () => {
    if (selectedReason) {
      onSubmit(selectedReason);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
        <h3 className="text-lg font-bold text-slate-800 mb-4">
          Report This Message
        </h3>

        <div className="space-y-2 mb-6">
          {FLAG_REASONS.map((reason) => (
            <label
              key={reason}
              className="flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-slate-100"
            >
              <input
                type="radio"
                name="reason"
                value={reason}
                checked={selectedReason === reason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="w-4 h-4 cursor-pointer"
              />
              <span className="text-slate-700">{reason}</span>
            </label>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedReason}
            className={`flex-1 px-4 py-2 rounded-lg font-medium text-white transition-colors ${
              selectedReason
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-slate-300 cursor-not-allowed'
            }`}
          >
            Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlagModal;
```

---

## Integration Guide

### Step 1: Install Dependencies

```bash
npm install socket.io-client zustand
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Step 2: Create Store

Copy `store/chatStore.ts` from Section above into your project.

### Step 3: Add Components

Create a `components/` folder and copy all 7 component files (.tsx) from above.

### Step 4: Configure Tailwind

Ensure your `tailwind.config.ts` includes component paths:

```typescript
export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

### Step 5: Use ChatSpace Component

In your page/section:

```typescript
import ChatSpace from '@/components/ChatSpace';

export default function Page() {
  return (
    <ChatSpace backendUrl="https://your-render-backend.onrender.com" />
  );
}
```

### Step 6: Backend Integration

Your Render backend should implement these Socket.IO event handlers:

**Events to emit from backend:**

```typescript
// When client connects
socket.emit('topic:list', topicList);

// When client requests topic messages
socket.emit('topic:messages', messageList);

// When new message created
io.emit('message:new', message);

// When poll vote received
io.emit('poll:updated', { messageId, relatableCount });
```

**Events to listen from client:**

```typescript
// New message
socket.on('message:create', ({ topicId, text, imageUrl, sessionId }) => {
  // Validate, save to Turso, broadcast
});

// Poll vote
socket.on('poll:vote', ({ messageId, sessionId }) => {
  // Check if vote exists, insert if not, update relatable_count, broadcast
});

// Flag message
socket.on('message:flag', ({ messageId, reason, sessionId }) => {
  // Increment flag_count, save flag record
});

// Load topic messages
socket.on('topic:load', ({ topicId }) => {
  // Query Turso, return messages
});
```

---

## Validation Checklist

- [ ] All 7 components (.tsx files) created and imported.
- [ ] Socket.IO connected to your Render backend.
- [ ] Initial topics and messages load on mount.
- [ ] Sending a message updates in real-time on all clients.
- [ ] Clicking "✨ Relate" increments count and broadcasts.
- [ ] Flag modal opens/closes and submits reason.
- [ ] Character counter warns at 80%, errors at 100%.
- [ ] UI is responsive on mobile (tabs scroll horizontally).
- [ ] Keyboard navigation (Tab, Enter) works.
- [ ] All ARIA labels present for accessibility.

---

## Notes

- **Session ID**: Generated per browser tab/window. Tracks votes and rate limiting on frontend.
- **Rate Limiting**: Implement on backend (IP-based).
- **Moderation**: Flag count visible. Admin panel separate (not included here).
- **Performance**: Messages list scrollable (max-height: 24rem). Consider pagination if >100 messages.
- **Error Handling**: Add error boundaries and retry logic in production.
- **Analytics**: Track message sends, relates, flags in your analytics system (optional).

---

