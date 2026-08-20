import { useEffect, useState } from "react";
import {
  UserMultiple02Icon,
  Building06Icon,
  Target02Icon,
  Task01Icon,
  Note01Icon,
} from "hugeicons-react";
import { getAdminStats } from "../lib/mockApi";

const CARDS = [
  { key: "userCount", label: "Total Users", icon: UserMultiple02Icon },
  { key: "workspaceCount", label: "Workspaces", icon: Building06Icon },
  { key: "projectCount", label: "Projects", icon: Target02Icon },
  { key: "taskCount", label: "Tasks", icon: Task01Icon },
  { key: "noteCount", label: "Notes", icon: Note01Icon },
];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getAdminStats().then(setStats);
  }, []);

  return (
    <div className="px-10 py-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-1 text-sm text-(--color-text-muted)">Platform-wide overview across every workspace.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {CARDS.map(({ key, label, icon: Icon }) => (
          <div
            key={key}
            className="rounded-xl border border-(--color-border) p-4"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-(--color-accent)/10 text-(--color-accent)">
              <Icon size={18} strokeWidth={1.8} />
            </div>
            <div className="mt-3 text-2xl font-semibold tabular-nums">
              {stats ? stats[key] : "—"}
            </div>
            <div className="text-xs text-(--color-text-muted)">{label}</div>
          </div>
        ))}
      </div>

      {stats && stats.recentSignups.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-medium text-(--color-text-muted)">Signups (last 30 days)</h2>
          <div className="mt-3 flex items-end gap-1.5">
            {stats.recentSignups.map((d) => {
              const max = Math.max(...stats.recentSignups.map((s) => s.count), 1);
              return (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    title={`${d.date}: ${d.count}`}
                    className="w-full rounded-t bg-(--color-accent)/60"
                    style={{ height: `${(d.count / max) * 80 + 4}px` }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
