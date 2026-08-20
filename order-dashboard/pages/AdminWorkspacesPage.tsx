import { useEffect, useState } from "react";
import { Search01Icon } from "hugeicons-react";
import { listAdminWorkspaces } from "../lib/mockApi";

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function AdminWorkspacesPage() {
  const [workspaces, setWorkspaces] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(() => {
      listAdminWorkspaces({ search })
        .then((data) => {
          setWorkspaces(data.workspaces);
          setTotal(data.total);
        })
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <div className="px-10 py-8">
      <h1 className="text-2xl font-semibold">Workspaces</h1>
      <p className="mt-1 text-sm text-(--color-text-muted)">{total} total across the platform.</p>

      <div className="mt-4 flex items-center gap-2 rounded-md border border-(--color-border) px-3 py-2 sm:w-80">
        <Search01Icon size={16} strokeWidth={1.8} className="text-(--color-text-muted)" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name…"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-(--color-text-muted)"
        />
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-(--color-border)">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-(--color-border) text-left text-xs text-(--color-text-muted)">
              <th className="px-4 py-2.5 font-medium">Workspace</th>
              <th className="px-4 py-2.5 font-medium">Owner</th>
              <th className="px-4 py-2.5 font-medium">Members</th>
              <th className="px-4 py-2.5 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {workspaces.map((w) => (
              <tr key={w._id} className="border-b border-(--color-border) last:border-0">
                <td className="px-4 py-2.5">
                  <span className="mr-1.5">{w.icon}</span>
                  <span className="font-medium">{w.name}</span>
                </td>
                <td className="px-4 py-2.5 text-(--color-text-muted)">
                  {w.owner?.name}
                  <span className="ml-1 text-xs">({w.owner?.email})</span>
                </td>
                <td className="px-4 py-2.5 tabular-nums">{w.memberCount}</td>
                <td className="px-4 py-2.5 text-(--color-text-muted)">{formatDate(w.createdAt)}</td>
              </tr>
            ))}
            {!loading && workspaces.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-(--color-text-muted)">
                  No workspaces found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
