// Sample data so the dashboard renders standalone, with no backend.
// Swap these functions for real fetch calls to your own API — every
// admin page only calls the four functions below.

const SAMPLE_USERS = [
  { _id: "1", name: "Tanvir Singh", email: "tanvir@example.com", avatarUrl: "", isEmailVerified: true, isSuperAdmin: true, createdAt: "2026-07-02T10:00:00Z" },
  { _id: "2", name: "Priya Sharma", email: "priya@example.com", avatarUrl: "", isEmailVerified: true, isSuperAdmin: false, createdAt: "2026-07-10T10:00:00Z" },
  { _id: "3", name: "Rahul Verma", email: "rahul@example.com", avatarUrl: "", isEmailVerified: false, isSuperAdmin: false, createdAt: "2026-07-18T10:00:00Z" },
];

const SAMPLE_WORKSPACES = [
  { _id: "w1", name: "Acme Inc", icon: "🏢", owner: { name: "Tanvir Singh", email: "tanvir@example.com" }, memberCount: 6, createdAt: "2026-07-02T10:00:00Z" },
  { _id: "w2", name: "Studio Nine", icon: "🎨", owner: { name: "Priya Sharma", email: "priya@example.com" }, memberCount: 3, createdAt: "2026-07-15T10:00:00Z" },
];

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export async function getAdminStats() {
  return {
    userCount: SAMPLE_USERS.length,
    workspaceCount: SAMPLE_WORKSPACES.length,
    projectCount: 12,
    taskCount: 84,
    noteCount: 27,
    recentSignups: [
      { date: daysAgo(4), count: 1 },
      { date: daysAgo(3), count: 2 },
      { date: daysAgo(2), count: 0 },
      { date: daysAgo(1), count: 3 },
      { date: daysAgo(0), count: 1 },
    ],
  };
}

export async function listAdminUsers({ search = "" } = {}) {
  const users = SAMPLE_USERS.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );
  return { users, total: users.length, page: 1, limit: 25 };
}

export async function listAdminWorkspaces({ search = "" } = {}) {
  const workspaces = SAMPLE_WORKSPACES.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase())
  );
  return { workspaces, total: workspaces.length, page: 1, limit: 25 };
}
