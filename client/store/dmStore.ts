import { create } from "zustand";
import type { Socket } from "socket.io-client";
import { apiFetch } from "@/utils/apiFetch";

export type DMRequestState = "idle" | "pending" | "accepted" | "declined";
export type DMContextType = "post" | "comment";

type DMMessageKind = "text" | "handle" | "system";

export interface DMContext {
  type: DMContextType;
  id: string;
  preview: string;
}

export interface IncomingRequest {
  requestId: string;
  fromUserId: string;
  fromUserName: string;
  context: DMContext;
}

export interface DMSocialHandles {
  linkedin: string | null;
  instagram: string | null;
  discord: string | null;
}

export interface DMMessage {
  id: string;
  roomId: string;
  kind: DMMessageKind;
  fromUserId: string;
  fromUserName: string;
  text?: string;
  platform?: "linkedin" | "instagram" | "discord";
  handle?: string;
  timestamp: number;
}

interface ActiveChat {
  roomId: string;
  otherUserId: string;
  otherUserName: string;
}

interface ConnectionSummary {
  roomId: string;
  otherUserId: string;
  otherUserName: string;
  connectedAt: number;
}

interface DMStore {
  socket: Socket | null;
  currentUserId: string | null;
  currentUserName: string;
  requestState: DMRequestState;
  incomingRequest: IncomingRequest | null;
  incomingRequests: IncomingRequest[];
  connections: ConnectionSummary[];
  activeChat: ActiveChat | null;
  messages: DMMessage[];
  requestError: string | null;
  handles: DMSocialHandles;
  hasBoundSocketEvents: boolean;
  initialize: (socket: Socket, currentUserId: string, currentUserName: string) => void;
  sendRequest: (toUserId: string, context: DMContext) => void;
  acceptRequest: (requestId: string) => void;
  declineRequest: (requestId: string) => void;
  sendMessage: (roomId: string, text: string) => void;
  shareHandle: (roomId: string, platform: "linkedin" | "instagram" | "discord", handle: string) => void;
  closeChat: () => void;
  loadSavedHandles: () => Promise<void>;
  saveHandles: (handles: Partial<DMSocialHandles>) => Promise<void>;
  clearIncomingRequest: () => void;
}

function uniqueMessageId(prefix: string) {
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

export const useDMStore = create<DMStore>((set, get) => ({
  socket: null,
  currentUserId: null,
  currentUserName: "You",
  requestState: "idle",
  incomingRequest: null,
  incomingRequests: [],
  connections: [],
  activeChat: null,
  messages: [],
  requestError: null,
  handles: {
    linkedin: null,
    instagram: null,
    discord: null,
  },
  hasBoundSocketEvents: false,

  initialize: (socket, currentUserId, currentUserName) => {
    const prevSocket = get().socket;
    const shouldBind = !get().hasBoundSocketEvents || prevSocket !== socket;

    if (shouldBind) {
      socket.off("dm:incoming_request");
      socket.off("dm:accepted");
      socket.off("dm:opened");
      socket.off("dm:declined");
      socket.off("dm:request_sent");
      socket.off("dm:message");
      socket.off("dm:handle_received");
      socket.off("dm:user_left");
      socket.off("dm:error");

      socket.on("dm:incoming_request", (payload: IncomingRequest) => {
        set((state) => {
          const alreadyExists = state.incomingRequests.some(
            (request) => request.requestId === payload.requestId,
          );
          const nextIncomingRequests = alreadyExists
            ? state.incomingRequests
            : [...state.incomingRequests, payload];

          return {
            incomingRequest: state.incomingRequest ?? payload,
            incomingRequests: nextIncomingRequests,
            requestError: null,
          };
        });
      });

      socket.on("dm:accepted", (payload: { roomId: string; otherUserId: string; otherUserName: string }) => {
        set((state) => {
          const connection: ConnectionSummary = {
            roomId: payload.roomId,
            otherUserId: payload.otherUserId,
            otherUserName: payload.otherUserName || "User",
            connectedAt: Date.now(),
          };
          const nextConnections = [
            connection,
            ...state.connections.filter((item) => item.roomId !== payload.roomId),
          ];

          return {
            requestState: "accepted",
            activeChat: {
              roomId: payload.roomId,
              otherUserId: payload.otherUserId,
              otherUserName: payload.otherUserName || "User",
            },
            connections: nextConnections,
            messages: [],
            requestError: null,
          };
        });
      });

      socket.on("dm:opened", (payload: { roomId: string; otherUserId: string; otherUserName: string }) => {
        set((state) => {
          const connection: ConnectionSummary = {
            roomId: payload.roomId,
            otherUserId: payload.otherUserId,
            otherUserName: payload.otherUserName || "User",
            connectedAt: Date.now(),
          };
          const nextConnections = [
            connection,
            ...state.connections.filter((item) => item.roomId !== payload.roomId),
          ];
          const nextIncomingRequests = state.incomingRequests.filter(
            (request) => request.fromUserId !== payload.otherUserId,
          );

          return {
            requestState: "accepted",
            incomingRequest: null,
            incomingRequests: nextIncomingRequests,
            activeChat: {
              roomId: payload.roomId,
              otherUserId: payload.otherUserId,
              otherUserName: payload.otherUserName || "User",
            },
            connections: nextConnections,
            messages: [],
            requestError: null,
          };
        });
      });

      socket.on("dm:declined", () => {
        set({ requestState: "declined", requestError: "Request declined" });
      });

      socket.on("dm:request_sent", () => {
        // Keep sender UI responsive; avoid global "Waiting..." lock.
        set({ requestState: "idle", requestError: null });
      });

      socket.on("dm:message", (payload: { roomId: string; fromUserId: string; fromUserName: string; text: string; timestamp: number }) => {
        const activeChat = get().activeChat;
        if (!activeChat || payload.roomId !== activeChat.roomId) return;

        const message: DMMessage = {
          id: uniqueMessageId("msg"),
          kind: "text",
          roomId: payload.roomId,
          fromUserId: payload.fromUserId,
          fromUserName: payload.fromUserName || "User",
          text: payload.text,
          timestamp: Number(payload.timestamp || Date.now()),
        };
        set((state) => ({ messages: [...state.messages, message] }));
      });

      socket.on("dm:handle_received", (payload: { roomId: string; fromUserId: string; fromUserName: string; platform: "linkedin" | "instagram" | "discord"; handle: string; timestamp: number }) => {
        const activeChat = get().activeChat;
        if (!activeChat || payload.roomId !== activeChat.roomId) return;

        const message: DMMessage = {
          id: uniqueMessageId("handle"),
          kind: "handle",
          roomId: payload.roomId,
          fromUserId: payload.fromUserId,
          fromUserName: payload.fromUserName || "User",
          platform: payload.platform,
          handle: payload.handle,
          timestamp: Number(payload.timestamp || Date.now()),
        };
        set((state) => ({ messages: [...state.messages, message] }));
      });

      socket.on("dm:user_left", (payload: { roomId: string }) => {
        const activeChat = get().activeChat;
        if (!activeChat || payload.roomId !== activeChat.roomId) return;

        const systemMessage: DMMessage = {
          id: uniqueMessageId("sys"),
          kind: "system",
          roomId: payload.roomId,
          fromUserId: "system",
          fromUserName: "System",
          text: "User has left. Chat is now closed.",
          timestamp: Date.now(),
        };

        set((state) => ({
          messages: [...state.messages, systemMessage],
          activeChat: null,
          requestState: "idle",
        }));
      });

      socket.on("dm:error", (payload: { message?: string }) => {
        set({ requestError: payload?.message || "DM action failed", requestState: "idle" });
      });
    }

    set({
      socket,
      currentUserId,
      currentUserName: currentUserName || "You",
      hasBoundSocketEvents: true,
    });

    socket.emit("dm:sync_pending");
  },

  sendRequest: (toUserId, context) => {
    const socket = get().socket;
    if (!socket) return;

    set({ requestState: "pending", requestError: null });
    socket.emit("dm:request", { toUserId, context });
  },

  acceptRequest: (requestId) => {
    const socket = get().socket;
    if (!socket) return;
    socket.emit("dm:accept", { requestId });
    set((state) => {
      const nextIncomingRequests = state.incomingRequests.filter(
        (request) => request.requestId !== requestId,
      );
      const nextIncomingRequest =
        state.incomingRequest?.requestId === requestId ? nextIncomingRequests[0] || null : state.incomingRequest;

      return {
        incomingRequest: nextIncomingRequest,
        incomingRequests: nextIncomingRequests,
        requestError: null,
      };
    });
  },

  declineRequest: (requestId) => {
    const socket = get().socket;
    if (!socket) return;
    socket.emit("dm:decline", { requestId });
    set((state) => {
      const nextIncomingRequests = state.incomingRequests.filter(
        (request) => request.requestId !== requestId,
      );
      const nextIncomingRequest =
        state.incomingRequest?.requestId === requestId ? nextIncomingRequests[0] || null : state.incomingRequest;

      return {
        incomingRequest: nextIncomingRequest,
        incomingRequests: nextIncomingRequests,
        requestState: "idle",
      };
    });
  },

  sendMessage: (roomId, text) => {
    const socket = get().socket;
    const message = String(text || "").trim();
    if (!socket || !message) return;

    socket.emit("dm:message", { roomId, text: message });
  },

  shareHandle: (roomId, platform, handle) => {
    const socket = get().socket;
    const normalizedHandle = String(handle || "").trim().replace(/^@+/, "");
    if (!socket || !normalizedHandle) return;

    socket.emit("dm:share_handle", { roomId, platform, handle: normalizedHandle });
  },

  closeChat: () => {
    const socket = get().socket;
    const roomId = get().activeChat?.roomId;
    if (socket && roomId) {
      socket.emit("dm:leave_room", { roomId });
    }
    set({ activeChat: null, messages: [], requestState: "idle", requestError: null });
  },

  loadSavedHandles: async () => {
    try {
      const response = await apiFetch("/api/dm/handles/me", { credentials: "include" });
      if (!response.ok) return;
      const data = await response.json();
      set({
        handles: {
          linkedin: data?.linkedin || null,
          instagram: data?.instagram || null,
          discord: data?.discord || null,
        },
      });
    } catch {
      // ignore
    }
  },

  saveHandles: async (handles) => {
    const current = get().handles;
    const payload = {
      linkedin: handles.linkedin ?? current.linkedin,
      instagram: handles.instagram ?? current.instagram,
      discord: handles.discord ?? current.discord,
    };

    const response = await apiFetch("/api/dm/handles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("Failed to save handles");
    }

    const data = await response.json();
    set({
      handles: {
        linkedin: data?.linkedin || null,
        instagram: data?.instagram || null,
        discord: data?.discord || null,
      },
    });
  },

  clearIncomingRequest: () => set({ incomingRequest: null }),
}));
