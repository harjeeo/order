import { useEffect, useState } from "react";
import { CalendarAdd01Icon, PlusSignIcon, CheckmarkCircle02Icon, Cancel01Icon, UserGroupIcon } from "hugeicons-react";
import { getReservations, createReservation, setReservationStatus, getTables } from "../lib/api";

const STATUS_META = {
  booked: { label: "Booked", style: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  seated: { label: "Seated", style: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  cancelled: { label: "Cancelled", style: "bg-black/10 text-(--color-text-muted) dark:bg-white/10" },
  no_show: { label: "No-show", style: "bg-red-500/10 text-red-600 dark:text-red-400" },
};

function formatDateTime(iso) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function defaultDateTimeLocal() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function CafeReservationsPage() {
  const [reservations, setReservations] = useState([]);
  const [tables, setTables] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    partySize: 2,
    reservedFor: defaultDateTimeLocal(),
    tableId: "",
    notes: "",
  });

  async function refresh() {
    setReservations(await getReservations({ status: statusFilter }));
  }

  useEffect(() => {
    refresh();
    getTables().then(setTables);
  }, [statusFilter]);

  async function handleCreate() {
    if (!form.customerName.trim() || !form.reservedFor) return;
    await createReservation({
      customerName: form.customerName.trim(),
      phone: form.phone,
      partySize: Number(form.partySize) || 1,
      reservedFor: new Date(form.reservedFor).toISOString(),
      tableId: form.tableId || null,
      notes: form.notes,
    });
    setForm({ customerName: "", phone: "", partySize: 2, reservedFor: defaultDateTimeLocal(), tableId: "", notes: "" });
    setShowForm(false);
    refresh();
  }

  async function handleStatus(reservation, status) {
    await setReservationStatus(reservation._id, status);
    refresh();
  }

  return (
    <div className="px-8 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <CalendarAdd01Icon size={20} strokeWidth={1.8} />
            Reservations
          </h1>
          <p className="mt-1 text-sm text-(--color-text-muted)">Book tables in advance for walk-in-averse guests.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-md bg-(--color-accent) px-3 py-1.5 text-sm font-medium text-white"
        >
          <PlusSignIcon size={14} strokeWidth={1.8} />
          New Reservation
        </button>
      </div>

      <div className="mt-4 flex gap-2">
        {["all", "booked", "seated", "cancelled", "no_show"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded-full border px-3 py-1 text-xs capitalize ${
              statusFilter === s ? "border-(--color-accent) bg-(--color-accent)/10 text-(--color-accent)" : "border-(--color-border) text-(--color-text-muted)"
            }`}
          >
            {s.replace("_", "-")}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-(--color-border)">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-(--color-border) text-xs text-(--color-text-muted)">
              <th className="px-3 py-2 font-medium">Guest</th>
              <th className="px-3 py-2 font-medium">Party Size</th>
              <th className="px-3 py-2 font-medium">Table</th>
              <th className="px-3 py-2 font-medium">Time</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((r) => (
              <tr key={r._id} className="border-b border-(--color-border) last:border-0">
                <td className="px-3 py-2">
                  <div className="font-medium">{r.customerName}</div>
                  {r.phone && <div className="text-xs text-(--color-text-muted)">{r.phone}</div>}
                </td>
                <td className="px-3 py-2">
                  <span className="flex items-center gap-1 text-(--color-text-muted)">
                    <UserGroupIcon size={12} strokeWidth={1.8} />
                    {r.partySize}
                  </span>
                </td>
                <td className="px-3 py-2 text-(--color-text-muted)">{r.table ?? "-"}</td>
                <td className="px-3 py-2 text-(--color-text-muted)">{formatDateTime(r.reservedFor)}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_META[r.status].style}`}>
                    {STATUS_META[r.status].label}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {r.status === "booked" && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleStatus(r, "seated")}
                        title="Seat guest"
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-(--color-border) text-emerald-600 dark:text-emerald-400"
                      >
                        <CheckmarkCircle02Icon size={14} strokeWidth={1.8} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatus(r, "cancelled")}
                        title="Cancel"
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-(--color-border) text-red-500"
                      >
                        <Cancel01Icon size={14} strokeWidth={1.8} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {reservations.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-(--color-text-muted)">
                  No reservations.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-sm rounded-xl bg-(--color-canvas) p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">New Reservation</h3>
            <div className="mt-3 flex flex-col gap-2.5">
              <input
                placeholder="Guest name"
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                className="rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none"
              />
              <input
                placeholder="Phone (optional)"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  value={form.partySize}
                  onChange={(e) => setForm({ ...form, partySize: Number(e.target.value) })}
                  placeholder="Party size"
                  className="w-24 rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none"
                />
                <select
                  value={form.tableId}
                  onChange={(e) => setForm({ ...form, tableId: e.target.value })}
                  className="flex-1 rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none"
                >
                  <option value="">No table assigned</option>
                  {tables.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.number} ({t.capacity} seats)
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="datetime-local"
                value={form.reservedFor}
                onChange={(e) => setForm({ ...form, reservedFor: e.target.value })}
                className="rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none"
              />
              <textarea
                placeholder="Notes (optional)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="resize-none rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none"
              />
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 rounded-md border border-(--color-border) py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!form.customerName.trim()}
                className="flex-1 rounded-md bg-(--color-accent) py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                Book Table
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
