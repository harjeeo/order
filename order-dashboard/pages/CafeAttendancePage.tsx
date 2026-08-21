import { useEffect, useState } from "react";
import { Clock01Icon } from "hugeicons-react";
import { getShifts } from "../lib/api";
import Pagination from "../components/Pagination";

const PAGE_SIZE = 30;

function formatDateTime(iso) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function formatDuration(clockIn, clockOut) {
  if (!clockOut) return "In progress";
  const ms = new Date(clockOut).getTime() - new Date(clockIn).getTime();
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}

export default function CafeAttendancePage() {
  const [shifts, setShifts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    getShifts({ page, pageSize: PAGE_SIZE }).then((res) => {
      setShifts(res.items);
      setTotal(res.total);
    });
  }, [page]);

  return (
    <div className="px-8 py-6">
      <h1 className="flex items-center gap-2 text-2xl font-semibold">
        <Clock01Icon size={20} strokeWidth={1.8} />
        Attendance
      </h1>
      <p className="mt-1 text-sm text-(--color-text-muted)">Clock-in/out history for every staff member.</p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-(--color-border)">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-(--color-border) text-xs text-(--color-text-muted)">
              <th className="px-3 py-2 font-medium">Staff</th>
              <th className="px-3 py-2 font-medium">Role</th>
              <th className="px-3 py-2 font-medium">Clock In</th>
              <th className="px-3 py-2 font-medium">Clock Out</th>
              <th className="px-3 py-2 font-medium">Duration</th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((s) => (
              <tr key={s._id} className="border-b border-(--color-border) last:border-0">
                <td className="px-3 py-2 font-medium">{s.staffName}</td>
                <td className="px-3 py-2 text-(--color-text-muted)">{s.role}</td>
                <td className="px-3 py-2 text-(--color-text-muted)">{formatDateTime(s.clockIn)}</td>
                <td className="px-3 py-2 text-(--color-text-muted)">{s.clockOut ? formatDateTime(s.clockOut) : "-"}</td>
                <td className="px-3 py-2">
                  {s.clockOut ? (
                    <span className="text-(--color-text-muted)">{formatDuration(s.clockIn, s.clockOut)}</span>
                  ) : (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                      In progress
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {shifts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm text-(--color-text-muted)">
                  No attendance recorded yet.
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
