import { useEffect, useState } from "react";
import { PlusSignIcon, Delete02Icon, Cancel01Icon, Wallet01Icon, Calendar01Icon } from "hugeicons-react";
import { getExpenses, createExpense, deleteExpense, EXPENSE_CATEGORIES, PAYMENT_METHODS } from "../lib/mockApi";

function emptyForm() {
  return {
    category: EXPENSE_CATEGORIES[0],
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    method: PAYMENT_METHODS[0],
    notes: "",
  };
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
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());

  async function refresh() {
    setExpenses(await getExpenses({ category, search }));
  }

  useEffect(() => {
    refresh();
  }, [category, search]);

  async function handleAdd() {
    if (!form.amount) return;
    await createExpense({ ...form, amount: Number(form.amount) });
    setForm(emptyForm());
    setShowForm(false);
    refresh();
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
          <h1 className="text-2xl font-semibold">Expenses</h1>
          <p className="mt-1 text-sm text-(--color-text-muted)">Rent, salaries, purchases and other costs.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-md bg-(--color-accent) px-3 py-1.5 text-sm font-medium text-white"
        >
          <PlusSignIcon size={14} strokeWidth={1.8} />
          Add Expense
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
              <th className="px-3 py-2 font-medium">Category</th>
              <th className="px-3 py-2 font-medium">Amount</th>
              <th className="px-3 py-2 font-medium">Payment Method</th>
              <th className="px-3 py-2 font-medium">Notes</th>
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
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-(--color-text-muted)">
                  No expenses recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/30 p-4" onClick={() => setShowForm(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl border border-(--color-border) bg-(--color-canvas) p-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Add Expense</h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-(--color-text-muted) transition-colors hover:bg-black/5 hover:text-(--color-text) dark:hover:bg-white/10"
              >
                <Cancel01Icon size={16} strokeWidth={1.8} />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="Amount"
                className="rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
              />
              <div className="flex items-center gap-2 rounded-md border border-(--color-border) px-2">
                <Calendar01Icon size={14} strokeWidth={1.8} className="text-(--color-text-muted)" />
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full bg-transparent p-2 text-sm outline-none"
                />
              </div>
              <select
                value={form.method}
                onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
                className="rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Notes (optional)"
                rows={2}
                className="resize-none rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
              />
            </div>

            <button
              type="button"
              onClick={handleAdd}
              className="mt-4 w-full rounded-md bg-(--color-accent) py-2 text-sm font-medium text-white"
            >
              Add Expense
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
