import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  getSession,
  setSession,
  logout,
  homePathForRole,
  loginPathForRole,
  startImpersonation,
  getImpersonation,
  exitImpersonation,
  login,
  signup,
  completeTwoFactorLogin,
  type Session,
} from "../lib/useAuth";

const cafeSession: Session = {
  name: "Cafe Admin",
  email: "staff@example.test",
  role: "cafe",
  token: "cafe-token",
  tenantId: "tenant-1",
};

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("session storage", () => {
  it("returns null when nothing is stored", () => {
    expect(getSession()).toBeNull();
  });

  it("round-trips a session through localStorage", () => {
    setSession(cafeSession);
    expect(getSession()).toEqual(cafeSession);
  });

  it("returns null for corrupted JSON instead of throwing", () => {
    localStorage.setItem("order-dashboard-session", "{not json");
    expect(getSession()).toBeNull();
  });

  it("logout clears both the session and any impersonation state", () => {
    setSession(cafeSession);
    localStorage.setItem("order-dashboard-impersonation", JSON.stringify({ originalSession: cafeSession, tenantName: "X" }));
    logout();
    expect(getSession()).toBeNull();
    expect(getImpersonation()).toBeNull();
  });
});

describe("role path helpers", () => {
  it("maps super-admin to its home and login paths", () => {
    expect(homePathForRole("super-admin")).toBe("/super-admin");
    expect(loginPathForRole("super-admin")).toBe("/login/super-admin");
  });

  it("maps cafe to its home and login paths", () => {
    expect(homePathForRole("cafe")).toBe("/cafe");
    expect(loginPathForRole("cafe")).toBe("/login/cafe");
  });
});

describe("impersonation", () => {
  const superAdminSession: Session = {
    name: "Platform Owner",
    email: "owner@example.test",
    role: "super-admin",
    token: "super-token",
    tenantId: null,
  };

  it("throws when starting impersonation with no active session", () => {
    expect(() =>
      startImpersonation({ token: "t", user: { name: "N", email: "e@x.test", role: "ADMIN", tenantId: "tenant-1" } }, "Some Cafe")
    ).toThrow(/no active session/i);
  });

  it("swaps in the impersonated session and stashes the original for restore", () => {
    setSession(superAdminSession);
    startImpersonation({ token: "impersonated-token", user: { name: "Cafe Owner", email: "owner@cafe.test", role: "ADMIN", tenantId: "tenant-9" } }, "Test Cafe");

    const active = getSession();
    expect(active?.role).toBe("cafe");
    expect(active?.token).toBe("impersonated-token");
    expect(active?.tenantId).toBe("tenant-9");

    const state = getImpersonation();
    expect(state?.tenantName).toBe("Test Cafe");
    expect(state?.originalSession).toEqual(superAdminSession);
  });

  it("restores the original session on exit and clears the impersonation flag", () => {
    setSession(superAdminSession);
    startImpersonation({ token: "impersonated-token", user: { name: "Cafe Owner", email: "owner@cafe.test", role: "ADMIN", tenantId: "tenant-9" } }, "Test Cafe");

    const restored = exitImpersonation();
    expect(restored).toEqual(superAdminSession);
    expect(getSession()).toEqual(superAdminSession);
    expect(getImpersonation()).toBeNull();
  });

  it("returns null from exitImpersonation when nothing is being impersonated", () => {
    setSession(cafeSession);
    expect(exitImpersonation()).toBeNull();
  });
});

describe("login()", () => {
  it("stores a session mapped from the backend response on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          token: "abc",
          user: { name: "Cafe Admin", email: "staff@example.test", role: "ADMIN", tenantId: "tenant-1" },
        }),
      })
    );

    const session: any = await login("staff@example.test", "password123");
    expect(session.role).toBe("cafe");
    expect(getSession()?.token).toBe("abc");
  });

  it("maps SUPER_ADMIN to the super-admin app role", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: "abc", user: { name: "Owner", email: "owner@example.test", role: "SUPER_ADMIN", tenantId: null } }),
      })
    );

    const session: any = await login("owner@example.test", "password123");
    expect(session.role).toBe("super-admin");
  });

  it("throws the server's error message and does not store a session on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "Invalid credentials" }) })
    );

    await expect(login("wrong@example.test", "bad")).rejects.toThrow("Invalid credentials");
    expect(getSession()).toBeNull();
  });
});

describe("login() with 2FA", () => {
  it("returns a requires2FA result instead of a session, and doesn't store one", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ requires2FA: true, mfaToken: "mfa-abc" }) })
    );

    const result = await login("staff@example.test", "password123");
    expect(result).toEqual({ requires2FA: true, mfaToken: "mfa-abc" });
    expect(getSession()).toBeNull();
  });
});

describe("completeTwoFactorLogin()", () => {
  it("stores a session on a valid code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          token: "real-token",
          user: { name: "Cafe Admin", email: "staff@example.test", role: "ADMIN", tenantId: "tenant-1" },
        }),
      })
    );

    const session = await completeTwoFactorLogin("mfa-abc", "123456");
    expect(session.token).toBe("real-token");
    expect(getSession()?.token).toBe("real-token");
  });

  it("throws and doesn't store a session on an invalid code", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "Invalid verification code" }) }));
    await expect(completeTwoFactorLogin("mfa-abc", "000000")).rejects.toThrow("Invalid verification code");
    expect(getSession()).toBeNull();
  });
});

describe("signup()", () => {
  it("stores a session on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: "new-token", user: { name: "New Owner", email: "new@example.test", role: "ADMIN", tenantId: "tenant-2" } }),
      })
    );

    const session = await signup({ cafeName: "New Cafe", ownerName: "New Owner", email: "new@example.test", password: "password123" });
    expect(session.tenantId).toBe("tenant-2");
    expect(getSession()?.email).toBe("new@example.test");
  });

  it("throws when self sign-up is disabled server-side", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "Self sign-up is currently disabled." }) })
    );

    await expect(
      signup({ cafeName: "Blocked Cafe", ownerName: "X", email: "x@example.test", password: "password123" })
    ).rejects.toThrow(/disabled/);
  });
});
