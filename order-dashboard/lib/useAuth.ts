export type Role = "super-admin" | "cafe";

export interface Session {
  name: string;
  email: string;
  role: Role;
}

const STORAGE_KEY = "order-dashboard-session";

// No real backend yet — this just persists a session in localStorage so the
// login flow, route guarding and logout work end-to-end. Swap getSession/
// login/logout for real API calls once auth exists server-side.
export function getSession(): Session | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function login(session: Session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function logout() {
  localStorage.removeItem(STORAGE_KEY);
}

export function homePathForRole(role: Role) {
  return role === "super-admin" ? "/super-admin" : "/cafe";
}
