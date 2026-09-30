import { useEffect, useState } from "react";
import { PlusSignIcon, Delete02Icon, Cancel01Icon, Wallet01Icon } from "hugeicons-react";
import { getExpenses, createExpensesBulk, deleteExpense, getStaff, EXPENSE_CATEGORIES, PAYMENT_METHODS } from "../lib/api";

const BLANK_ROWS = 10;

function emptyRow() {
  return { category: "", amount: "", notes: "", employeeName: "", method: PAYMENT_METHODS[0] };
}

function formatCurrency(n) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function CafeExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [staff, setStaff] = useState([]);
  const [showGrid, setShowGrid] = useState(false);
  const [rows, setRows] = useState([]);
  const [gridError, setGridError] = useState("");
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setExpenses(await getExpenses({ category, search }));
  }

  useEffect(() => {
    refresh();
  }, [category, search]);

  function openGrid() {
    setGridError("");
    setRows(Array.from({ length: BLANK_ROWS }, emptyRow));
    getStaff().then(setStaff);
    setShowGrid(true);
  }

  function updateRow(index, field, value) {
    setRows((rs) => rs.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function addMoreRows() {
    setRows((rs) => [...rs, ...Array.from({ length: BLANK_ROWS }, emptyRow)]);
  }

  function removeRow(index) {
    setRows((rs) => rs.filter((_, i) => i !== index));
  }

  async function handleSaveGrid() {
    const valid = rows.filter((r) => r.category && Number(r.amount) > 0);
    if (valid.length === 0) {
      setGridError("Add at least one row with a reason and amount.");
      return;
    }
    setGridError("");
    setSaving(true);
    try {
      await createExpensesBulk(valid);
      setShowGrid(false);
      refresh();
    } catch (err) {
      setGridError(err instanceof Error ? err.message : "Could not save expenses");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(expense) {
    await deleteExpense(expense._id);
    refresh();
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="px-8 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Wallet01Icon size={20} strokeWidth={1.8} />
            Expenses
          </h1>
          <p className="mt-1 text-sm text-(--color-text-muted)">Rent, salaries, purchases and other costs.</p>
        </div>
        <button
          type="button"
          onClick={openGrid}
          className="flex items-center gap-1.5 rounded-md bg-(--color-accent) px-3 py-1.5 text-sm font-medium text-white"
        >
          <PlusSignIcon size={14} strokeWidth={1.8} />
          Add Expenses
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-xl border border-(--color-border) px-3 py-2 text-sm">
          <Wallet01Icon size={16} strokeWidth={1.8} className="text-(--color-accent)" />
          <span className="text-(--color-text-muted)">Total:</span>
          <span className="font-semibold tabular-nums">{formatCurrency(total)}</span>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notes…"
          className="w-56 rounded-md border border-(--color-border) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-md border border-(--color-border) bg-transparent px-2 py-2 text-sm outline-none"
        >
          <option value="All">All categories</option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-(--color-border)">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-(--color-border) text-xs text-(--color-text-muted)">
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Reason</th>
              <th className="px-3 py-2 font-medium">Amount</th>
              <th className="px-3 py-2 font-medium">Employee</th>
              <th className="px-3 py-2 font-medium">Paid From</th>
              <th className="px-3 py-2 font-medium">Explanation</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e._id} className="border-b border-(--color-border) last:border-0">
                <td className="px-3 py-2 text-(--color-text-muted)">{formatDate(e.date)}</td>
                <td className="px-3 py-2">
                  <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-medium dark:bg-white/10">{e.category}</span>
                </td>
                <td className="px-3 py-2 tabular-nums font-medium">{formatCurrency(e.amount)}</td>
                <td className="px-3 py-2 text-(--color-text-muted)">{e.employeeName || "-"}</td>
                <td className="px-3 py-2 text-(--color-text-muted)">{e.method}</td>
                <td className="px-3 py-2 text-(--color-text-muted)">{e.notes || "-"}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => handleDelete(e)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-(--color-text-muted) transition-colors hover:bg-red-500/10 hover:text-red-500"
                  >
                    <Delete02Icon size={14} strokeWidth={1.8} />
                  </button>
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-(--color-text-muted)">
                  No expenses recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showGrid && (
        <div
          className="fixed inset-0 z-10 flex items-center justify-center bg-black/30 p-4"
          onClick={() => !saving && setShowGrid(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] w-full max-w-4xl flex-col rounded-xl border border-(--color-border) bg-(--color-canvas) p-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add Expenses</h2>
              <button
                type="button"
                onClick={() => setShowGrid(false)}
                disabled={saving}
                className="flex h-7 w-7 items-center justify-center rounded-md text-(--color-text-muted) transition-colors hover:bg-black/5 hover:text-(--color-text) disabled:opacity-50 dark:hover:bg-white/10"
              >
                <Cancel01Icon size={16} strokeWidth={1.8} />
              </button>
            </div>
            <p className="mt-1 text-xs text-(--color-text-muted)">
              Fill in as many rows as you need in one go. Only rows with a reason and amount get saved.
            </p>

            <div className="mt-3 flex-1 overflow-auto rounded-md border border-(--color-border)">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-(--color-canvas)">
                  <tr className="border-b border-(--color-border) text-xs text-(--color-text-muted)">
                    <th className="px-2 py-2 font-medium">Reason</th>
                    <th className="px-2 py-2 font-medium">Amount</th>
                    <th className="px-2 py-2 font-medium">Explanation</th>
                    <th className="px-2 py-2 font-medium">Employee</th>
                    <th className="px-2 py-2 font-medium">Paid From</th>
                    <th className="px-2 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={index} className="border-b border-(--color-border) last:border-0">
                      <td className="p-1.5">
                        <select
                          value={row.category}
                          onChange={(e) => updateRow(index, "category", e.target.value)}
                          className="w-36 rounded-md border border-(--color-border) bg-transparent p-1.5 text-sm outline-none focus:border-(--color-accent)"
                        >
                          <option value="">Select Reason</option>
                          {EXPENSE_CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-1.5">
                        <input
                          type="number"
                          min="0"
                          value={row.amount}
                          onChange={(e) => updateRow(index, "amount", e.target.value)}
                          placeholder="Enter Amount"
                          className="w-28 rounded-md border border-(--color-border) bg-transparent p-1.5 text-sm outline-none focus:border-(--color-accent)"
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          value={row.notes}
                          onChange={(e) => updateRow(index, "notes", e.target.value)}
                          placeholder="Enter Explanation"
                          className="w-40 rounded-md border border-(--color-border) bg-transparent p-1.5 text-sm outline-none focus:border-(--color-accent)"
                        />
                      </td>
                      <td className="p-1.5">
                        <select
                          value={row.employeeName}
                          onChange={(e) => updateRow(index, "employeeName", e.target.value)}
                          className="w-36 rounded-md border border-(--color-border) bg-transparent p-1.5 text-sm outline-none focus:border-(--color-accent)"
                        >
                          <option value="">Select Employee</option>
                          {staff.map((s) => (
                            <option key={s._id} value={s.name}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-1.5">
                        <select
                          value={row.method}
                          onChange={(e) => updateRow(index, "method", e.target.value)}
                          className="w-32 rounded-md border border-(--color-border) bg-transparent p-1.5 text-sm outline-none focus:border-(--color-accent)"
                        >
                          {PAYMENT_METHODS.map((m) => (
                            <option key={m} value={m}>
                              From {m}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-1.5">
                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-(--color-text-muted) transition-colors hover:bg-red-500/10 hover:text-red-500"
                        >
                          <Delete02Icon size={14} strokeWidth={1.8} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {gridError && <p className="mt-2 text-xs text-red-500">{gridError}</p>}

            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={addMoreRows}
                className="flex items-center gap-1.5 rounded-md border border-(--color-border) px-3 py-2 text-sm font-medium"
              >
                <PlusSignIcon size={14} strokeWidth={1.8} />
                Add {BLANK_ROWS} Rows
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowGrid(false)}
                  disabled={saving}
                  className="rounded-md border border-(--color-border) px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveGrid}
                  disabled={saving}
                  className="rounded-md bg-(--color-accent) px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
