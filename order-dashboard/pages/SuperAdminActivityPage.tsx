import { useEffect, useState } from "react";
import { Activity01Icon } from "hugeicons-react";
import { getAuditLog } from "../lib/api";
import Pagination from "../components/Pagination";

const PAGE_SIZE = 30;

const ACTION_LABELS = {
  "tenant.create": "Created client",
  "tenant.update": "Updated client",
  "tenant.suspend": "Suspended client",
  "tenant.activate": "Activated client",
  "tenant.delete": "Deleted client",
  "tenant.reset_password": "Reset client login password",
  "tenant.impersonate": "Logged in as client (support)",
  "tenant.auto_suspend_expired": "Plan expired — auto-suspended",
  "tenant.bulk_suspend": "Bulk-suspended clients",
  "tenant.bulk_activate": "Bulk-activated clients",
  "tenant.bulk_delete": "Bulk-deleted clients",
  "tenant.bulk_plan": "Bulk plan change",
};

function formatDateTime(iso) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function SuperAdminActivityPage() {
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    getAuditLog({ page, pageSize: PAGE_SIZE }).then((res) => {
      setEntries(res.items);
      setTotal(res.total);
    });
  }, [page]);

  return (
    <div className="px-10 py-8">
      <h1 className="flex items-center gap-2 text-2xl font-semibold">
        <Activity01Icon size={20} strokeWidth={1.8} />
        Activity Log
      </h1>
      <p className="mt-1 text-sm text-(--color-text-muted)">
        Every administrative action taken on a client — who did it, and when.
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-(--color-border)">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-(--color-border) text-xs text-(--color-text-muted)">
              <th className="px-3 py-2 font-medium">When</th>
              <th className="px-3 py-2 font-medium">Action</th>
              <th className="px-3 py-2 font-medium">By</th>
              <th className="px-3 py-2 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e._id} className="border-b border-(--color-border) last:border-0">
                <td className="whitespace-nowrap px-3 py-2 text-(--color-text-muted)">{formatDateTime(e.createdAt)}</td>
                <td className="px-3 py-2 font-medium">{ACTION_LABELS[e.action] ?? e.action}</td>
                <td className="px-3 py-2 text-(--color-text-muted)">
                  {e.actorEmail === "system" ? (
                    <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">System</span>
                  ) : (
                    e.actorEmail
                  )}
                </td>
                <td className="max-w-xs truncate px-3 py-2 text-xs text-(--color-text-muted)" title={JSON.stringify(e.meta)}>
                  {e.meta && Object.keys(e.meta).length > 0 ? JSON.stringify(e.meta) : "-"}
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-sm text-(--color-text-muted)">
                  No activity recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
    </div>
  );
}
