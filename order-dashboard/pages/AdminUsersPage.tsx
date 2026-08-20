import { useEffect, useState } from "react";
import { Search01Icon, CheckmarkCircle02Icon, ShieldUserIcon } from "hugeicons-react";
import { listAdminUsers } from "../lib/mockApi";
import Avatar from "../components/Avatar";

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(() => {
      listAdminUsers({ search })
        .then((data) => {
          setUsers(data.users);
          setTotal(data.total);
        })
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <div className="px-10 py-8">
      <h1 className="text-2xl font-semibold">Users</h1>
      <p className="mt-1 text-sm text-(--color-text-muted)">{total} total across the platform.</p>

      <div className="mt-4 flex items-center gap-2 rounded-md border border-(--color-border) px-3 py-2 sm:w-80">
        <Search01Icon size={16} strokeWidth={1.8} className="text-(--color-text-muted)" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-(--color-text-muted)"
        />
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-(--color-border)">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-(--color-border) text-left text-xs text-(--color-text-muted)">
              <th className="px-4 py-2.5 font-medium">User</th>
              <th className="px-4 py-2.5 font-medium">Email</th>
              <th className="px-4 py-2.5 font-medium">Verified</th>
              <th className="px-4 py-2.5 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id} className="border-b border-(--color-border) last:border-0">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt={u.name} className="h-6 w-6 rounded-full object-cover" />
                    ) : (
                      <Avatar name={u.name} size={24} />
                    )}
                    <span className="font-medium">{u.name}</span>
                    {u.isSuperAdmin && (
                      <span title="Super admin" className="text-(--color-accent)">
                        <ShieldUserIcon size={14} strokeWidth={1.8} />
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-(--color-text-muted)">{u.email}</td>
                <td className="px-4 py-2.5">
                  {u.isEmailVerified ? (
                    <CheckmarkCircle02Icon size={16} strokeWidth={1.8} className="text-(--color-accent)" />
                  ) : (
                    <span className="text-xs text-(--color-text-muted)">No</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-(--color-text-muted)">{formatDate(u.createdAt)}</td>
              </tr>
            ))}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-(--color-text-muted)">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
