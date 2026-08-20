export type Role = "super-admin" | "cafe";

export interface Session {
  name: string;
  email: string;
  role: Role;
  token: string;
  tenantId: string | null;
}

const STORAGE_KEY = "order-dashboard-session";
const IMPERSONATION_KEY = "order-dashboard-impersonation";

interface ImpersonationState {
  originalSession: Session;
  tenantName: string;
}

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
  localStorage.removeItem(IMPERSONATION_KEY);
}

export function homePathForRole(role: Role) {
  return role === "super-admin" ? "/super-admin" : "/cafe";
}

export function loginPathForRole(role: Role) {
  return role === "super-admin" ? "/login/super-admin" : "/login/cafe";
}

// Super Admin "login as tenant" support. The Super Admin's own session is
// stashed under a separate key so it can be restored on exit; the current
// session is swapped for the impersonated tenant admin's.
export function startImpersonation(impersonated: { token: string; user: { name: string; email: string; role: string; tenantId: string | null } }, tenantName: string) {
  const original = getSession();
  if (!original) throw new Error("No active session to impersonate from");

  const state: ImpersonationState = { originalSession: original, tenantName };
  localStorage.setItem(IMPERSONATION_KEY, JSON.stringify(state));

  setSession({
    name: impersonated.user.name,
    email: impersonated.user.email,
    role: backendRoleToAppRole(impersonated.user.role),
    token: impersonated.token,
    tenantId: impersonated.user.tenantId,
  });
}

export function getImpersonation(): ImpersonationState | null {
  const raw = localStorage.getItem(IMPERSONATION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ImpersonationState;
  } catch {
    return null;
  }
}

export function exitImpersonation(): Session | null {
  const state = getImpersonation();
  if (!state) return null;
  setSession(state.originalSession);
  localStorage.removeItem(IMPERSONATION_KEY);
  return state.originalSession;
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
