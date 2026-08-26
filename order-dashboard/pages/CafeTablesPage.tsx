import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  RestaurantTableIcon,
  UserGroupIcon,
  Login02Icon,
  Logout04Icon,
  ArrowDataTransferHorizontalIcon,
  GitMergeIcon,
  CreditCardIcon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
  QrCodeIcon,
  PlusSignIcon,
} from "hugeicons-react";
import { getTables, createTable, setTableStatus, transferTable, mergeTables } from "../lib/api";
import { getSession } from "../lib/useAuth";

function TableQrModal({ table, onClose }) {
  const [dataUrl, setDataUrl] = useState("");
  const tenantId = getSession()?.tenantId;
  const orderUrl = `${window.location.origin}/order/${tenantId}/${table._id}`;

  useEffect(() => {
    QRCode.toDataURL(orderUrl, { width: 320, margin: 1 }).then(setDataUrl);
  }, [orderUrl]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-xs rounded-xl bg-(--color-canvas) p-5 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold">Table {table.number}</h3>
        <p className="mt-1 text-xs text-(--color-text-muted)">Scan to view menu and order</p>
        {dataUrl && <img src={dataUrl} alt={`QR code for table ${table.number}`} className="mx-auto mt-4 rounded-md" />}
        <p className="mt-3 break-all text-[10px] text-(--color-text-muted)">{orderUrl}</p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 rounded-md border border-(--color-border) py-2 text-sm"
          >
            Print
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md bg-(--color-accent) py-2 text-sm font-medium text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function AddTableModal({ onClose, onCreated }) {
  const [number, setNumber] = useState("");
  const [capacity, setCapacity] = useState("4");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    setError("");
    if (!number.trim()) {
      setError("Enter a table number/name.");
      return;
    }
    setSaving(true);
    try {
      await createTable(number.trim(), Number(capacity) || 1);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create table");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-xs rounded-xl bg-(--color-canvas) p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold">Add Table</h3>

        <label className="mt-4 flex flex-col gap-1">
          <span className="text-xs text-(--color-text-muted)">Table number / name</span>
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="e.g. T1"
            autoFocus
            className="rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
          />
        </label>

        <label className="mt-3 flex flex-col gap-1">
          <span className="text-xs text-(--color-text-muted)">Seats</span>
          <input
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
          />
        </label>

        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border border-(--color-border) py-2 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={saving}
            className="flex-1 rounded-md bg-(--color-accent) py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Adding…" : "Add Table"}
          </button>
        </div>
      </div>
    </div>
  );
}

const STATUS_META = {
  available: { label: "Available", dot: "bg-emerald-500", card: "border-(--color-border)" },
  occupied: { label: "Occupied", dot: "bg-red-500", card: "border-red-500/40 bg-red-500/5" },
  reserved: { label: "Reserved", dot: "bg-amber-500", card: "border-amber-500/40 bg-amber-500/5" },
  billing: { label: "Billing", dot: "bg-blue-500", card: "border-blue-500/40 bg-blue-500/5" },
};

export default function CafeTablesPage() {
  const [tables, setTables] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState(null); // "transfer" | "merge" | null
  const [mergeSelection, setMergeSelection] = useState([]);
  const [status, setStatus] = useState("");
  const [qrTable, setQrTable] = useState(null);
  const [showAddTable, setShowAddTable] = useState(false);

  async function refresh() {
    const data = await getTables();
    setTables([...data]);
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(""), 2200);
    return () => clearTimeout(t);
  }, [status]);

  const selected = tables.find((t) => t._id === selectedId) ?? null;

  function selectTable(table) {
    if (mode === "transfer" && selected) {
      if (table.status !== "available") return;
      transferTable(selected._id, table._id).then(() => {
        refresh();
        setMode(null);
        setSelectedId(table._id);
        setStatus(`${selected.number} moved to ${table.number}.`);
      });
      return;
    }
    if (mode === "merge") {
      setMergeSelection((prev) =>
        prev.includes(table._id) ? prev.filter((id) => id !== table._id) : [...prev, table._id]
      );
      return;
    }
    setSelectedId(table._id);
    setMode(null);
    setMergeSelection([]);
  }

  async function handleStatusChange(newStatus) {
    if (!selected) return;
    await setTableStatus(selected._id, newStatus);
    await refresh();
    setStatus(`${selected.number} is now ${STATUS_META[newStatus].label.toLowerCase()}.`);
  }

  async function confirmMerge() {
    if (!selected || mergeSelection.length === 0) return;
    await mergeTables(mergeSelection, selected._id);
    await refresh();
    setStatus(`Merged ${mergeSelection.length} table(s) into ${selected.number}.`);
    setMode(null);
    setMergeSelection([]);
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold">
              <RestaurantTableIcon size={20} strokeWidth={1.8} />
              Tables
            </h1>
            <p className="mt-1 text-sm text-(--color-text-muted)">Floor plan and live table status.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-xs text-(--color-text-muted)">
              {Object.entries(STATUS_META).map(([key, meta]) => (
                <span key={key} className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                  {meta.label}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowAddTable(true)}
              className="flex items-center gap-1.5 rounded-md bg-(--color-accent) px-3 py-1.5 text-sm font-medium text-white"
            >
              <PlusSignIcon size={14} strokeWidth={1.8} />
              Add Table
            </button>
          </div>
        </div>

        {mode && (
          <div className="mt-4 flex items-center justify-between rounded-md bg-(--color-accent)/10 px-3 py-2 text-xs text-(--color-accent)">
            <span>
              {mode === "transfer"
                ? `Select an available table to move ${selected?.number}'s order to.`
                : `Select tables to merge into ${selected?.number}, then confirm.`}
            </span>
            <div className="flex items-center gap-2">
              {mode === "merge" && (
                <button
                  type="button"
                  onClick={confirmMerge}
                  disabled={mergeSelection.length === 0}
                  className="rounded bg-(--color-accent) px-2 py-1 text-white disabled:opacity-40"
                >
                  Confirm merge
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setMode(null);
                  setMergeSelection([]);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {tables.map((t) => {
            const meta = STATUS_META[t.status];
            const isSelected = t._id === selectedId;
            const isMergeChoice = mergeSelection.includes(t._id);
            return (
              <button
                key={t._id}
                type="button"
                onClick={() => selectTable(t)}
                className={`relative rounded-xl border p-4 text-left transition-colors ${meta.card} ${
                  isSelected || isMergeChoice ? "ring-2 ring-(--color-accent)" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <RestaurantTableIcon size={20} strokeWidth={1.8} />
                  <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                </div>
                <div className="mt-3 text-lg font-semibold">{t.number}</div>
                <div className="flex items-center gap-1 text-xs text-(--color-text-muted)">
                  <UserGroupIcon size={12} strokeWidth={1.8} />
                  {t.capacity} seats
                </div>
                <div className="mt-1 text-xs font-medium">{meta.label}</div>
              </button>
            );
          })}
          {tables.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-(--color-text-muted)">
              No tables yet — click "Add Table" to create your first one.
            </p>
          )}
        </div>
      </div>

      <div className="w-80 shrink-0 border-l border-(--color-border) p-5">
        {!selected ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-sm text-(--color-text-muted)">
            Select a table to view actions.
          </div>
        ) : (
          <div>
            <div className="text-xs text-(--color-text-muted)">Table</div>
            <h2 className="text-xl font-semibold">{selected.number}</h2>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-(--color-text-muted)">
              <UserGroupIcon size={14} strokeWidth={1.8} />
              {selected.capacity} seats · {STATUS_META[selected.status].label}
            </div>

            {status && (
              <div className="mt-4 rounded-md bg-(--color-accent)/10 px-3 py-2 text-xs text-(--color-accent)">
                {status}
              </div>
            )}

            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setQrTable(selected)}
                className="flex items-center justify-center gap-1.5 rounded-md border border-(--color-border) py-2 text-sm"
              >
                <QrCodeIcon size={15} strokeWidth={1.8} />
                QR Code
              </button>

              {selected.status === "available" && (
                <button
                  type="button"
                  onClick={() => handleStatusChange("occupied")}
                  className="flex items-center justify-center gap-1.5 rounded-md bg-(--color-accent) py-2 text-sm font-medium text-white"
                >
                  <Login02Icon size={15} strokeWidth={1.8} />
                  Open Table / Create Order
                </button>
              )}

              {selected.status === "reserved" && (
                <>
                  <button
                    type="button"
                    onClick={() => handleStatusChange("occupied")}
                    className="flex items-center justify-center gap-1.5 rounded-md bg-(--color-accent) py-2 text-sm font-medium text-white"
                  >
                    <CheckmarkCircle02Icon size={15} strokeWidth={1.8} />
                    Seat Guest
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange("available")}
                    className="flex items-center justify-center gap-1.5 rounded-md border border-(--color-border) py-2 text-sm"
                  >
                    <Cancel01Icon size={15} strokeWidth={1.8} />
                    Cancel Reservation
                  </button>
                </>
              )}

              {selected.status === "occupied" && (
                <>
                  <button
                    type="button"
                    onClick={() => setMode("transfer")}
                    className="flex items-center justify-center gap-1.5 rounded-md border border-(--color-border) py-2 text-sm"
                  >
                    <ArrowDataTransferHorizontalIcon size={15} strokeWidth={1.8} />
                    Transfer Table
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("merge")}
                    className="flex items-center justify-center gap-1.5 rounded-md border border-(--color-border) py-2 text-sm"
                  >
                    <GitMergeIcon size={15} strokeWidth={1.8} />
                    Merge Table
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange("billing")}
                    className="flex items-center justify-center gap-1.5 rounded-md bg-(--color-accent) py-2 text-sm font-medium text-white"
                  >
                    <CreditCardIcon size={15} strokeWidth={1.8} />
                    Move to Billing
                  </button>
                </>
              )}

              {selected.status === "billing" && (
                <button
                  type="button"
                  onClick={() => handleStatusChange("available")}
                  className="flex items-center justify-center gap-1.5 rounded-md bg-(--color-accent) py-2 text-sm font-medium text-white"
                >
                  <Logout04Icon size={15} strokeWidth={1.8} />
                  Close Table
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {qrTable && <TableQrModal table={qrTable} onClose={() => setQrTable(null)} />}
      {showAddTable && (
        <AddTableModal
          onClose={() => setShowAddTable(false)}
          onCreated={() => {
            setShowAddTable(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}
