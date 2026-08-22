import { io, type Socket } from "socket.io-client";
import { getToken } from "./useAuth";
import { getCurrentOutletId } from "./api";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

let socket: Socket | null = null;

// One shared connection per tab, reused across pages — Orders, Kitchen and
// the kitchen display all subscribe to the same socket instead of each
// opening their own. Connects lazily on first use, not at app boot.
export function getSocket(): Socket | null {
  const token = getToken();
  if (!token) return null;

  if (!socket) {
    socket = io(BASE_URL, { auth: { token }, autoConnect: true });
  }

  // Always emit — a single-outlet tenant never has anything in
  // localStorage (the outlet switcher only sets it once there's more than
  // one to switch between), and the server treats an empty outletId as
  // "join my tenant's default outlet" rather than "join nothing".
  socket.emit("join-outlet", getCurrentOutletId() ?? "");

  return socket;
}

// Subscribes to a live-update event ("orders:changed" / "kitchen:changed")
// and returns an unsubscribe function for the caller's effect cleanup.
export function onOutletEvent(event: "orders:changed" | "kitchen:changed", handler: () => void) {
  const s = getSocket();
  if (!s) return () => {};
  s.on(event, handler);
  return () => {
    s.off(event, handler);
  };
}
