import { io, Socket } from "socket.io-client";
import { getAccessToken } from "../utils/apiFetch";

let mehfilSocket: Socket | null = null;

export function getMehfilSocket(backendUrl?: string): Socket {
  if (mehfilSocket) return mehfilSocket;

  const socketUrl = backendUrl || window.location.origin;
  mehfilSocket = io(`${socketUrl}/mehfil`, {
    path: "/socket.io",
    auth: { token: getAccessToken() },
    withCredentials: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    transports: ["websocket", "polling"],
  });

  return mehfilSocket;
}

export function closeMehfilSocket() {
  if (!mehfilSocket) return;
  mehfilSocket.close();
  mehfilSocket = null;
}
