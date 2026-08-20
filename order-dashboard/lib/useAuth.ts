export type Role = "super-admin" | "cafe";

export interface Session {
  name: string;
  email: string;
  role: Role;
  token: string;
  tenantId: string | null;
}

const STORAGE_KEY = "order-dashboard-session";

export function getSession(): Session | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return getSession()?.token ?? null;
}

export function setSession(session: Session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function logout() {
  localStorage.removeItem(STORAGE_KEY);
}

export function homePathForRole(role: Role) {
  return role === "super-admin" ? "/super-admin" : "/cafe";
}

function backendRoleToAppRole(role: string): Role {
  return role === "SUPER_ADMIN" ? "super-admin" : "cafe";
}

// Calls the real backend. Throws with the server's error message on failure.
export async function login(email: string, password: string): Promise<Session> {
  const base = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Login failed");

  const session: Session = {
    name: data.user.name,
    email: data.user.email,
    role: backendRoleToAppRole(data.user.role),
    token: data.token,
    tenantId: data.user.tenantId,
  };
  setSession(session);
  return session;
}
