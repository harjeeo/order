import { useEffect, useState } from "react";
import { MoneySend01Icon, CheckmarkCircle02Icon } from "hugeicons-react";
import { getStaff, setStaffSalary, paySalary } from "../lib/api";
import Avatar from "../components/Avatar";

function formatCurrency(n) {
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

function isPaidThisMonth(lastSalaryPaidAt) {
  if (!lastSalaryPaidAt) return false;
  const paid = new Date(lastSalaryPaidAt);
  const now = new Date();
  return paid.getFullYear() === now.getFullYear() && paid.getMonth() === now.getMonth();
}

function formatDate(iso) {
  return iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-";
}

export default function CafePayrollPage() {
  const [staff, setStaff] = useState([]);
  const [editingSalaryId, setEditingSalaryId] = useState(null);
  const [salaryDraft, setSalaryDraft] = useState("");
  const [toast, setToast] = useState("");

  async function refresh() {
    setStaff(await getStaff());
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  function startEditSalary(member) {
    setEditingSalaryId(member._id);
    setSalaryDraft(String(member.monthlySalary || ""));
  }

  async function saveSalary(member) {
    await setStaffSalary(member._id, Number(salaryDraft) || 0);
    setEditingSalaryId(null);
    refresh();
  }

  async function handlePay(member) {
    try {
      await paySalary(member._id);
      setToast(`Paid ${member.name}'s salary for this month.`);
      refresh();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Could not process payment");
    }
  }

  const totalMonthly = staff.reduce((s, m) => s + (m.monthlySalary || 0), 0);

  return (
    <div className="px-8 py-6">
      <h1 className="flex items-center gap-2 text-2xl font-semibold">
        <MoneySend01Icon size={20} strokeWidth={1.8} />
        Payroll
      </h1>
      <p className="mt-1 text-sm text-(--color-text-muted)">
        Fixed monthly salary per staff member. Paying logs it as a Salary expense.
      </p>

      {toast && (
        <div className="mt-3 inline-block rounded-md bg-(--color-accent)/10 px-3 py-1.5 text-xs text-(--color-accent)">
          {toast}
        </div>
      )}

      <div className="mt-4 rounded-xl border border-(--color-border) p-4">
        <div className="text-xs text-(--color-text-muted)">Total Monthly Payroll</div>
        <div className="mt-1 text-2xl font-semibold tabular-nums">{formatCurrency(totalMonthly)}</div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-(--color-border)">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-(--color-border) text-xs text-(--color-text-muted)">
              <th className="px-3 py-2 font-medium">Staff</th>
              <th className="px-3 py-2 font-medium">Role</th>
              <th className="px-3 py-2 font-medium">Monthly Salary</th>
              <th className="px-3 py-2 font-medium">Last Paid</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((m) => {
              const paid = isPaidThisMonth(m.lastSalaryPaidAt);
              return (
                <tr key={m._id} className="border-b border-(--color-border) last:border-0">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Avatar name={m.name} size={24} />
                      <span className="font-medium">{m.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-(--color-text-muted)">{m.role}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {editingSalaryId === m._id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={salaryDraft}
                          onChange={(e) => setSalaryDraft(e.target.value)}
                          autoFocus
                          className="w-24 rounded-md border border-(--color-border) bg-transparent px-2 py-1 text-sm outline-none focus:border-(--color-accent)"
                        />
                        <button
                          type="button"
                          onClick={() => saveSalary(m)}
                          className="rounded-md bg-(--color-accent) px-2 py-1 text-xs font-medium text-white"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => startEditSalary(m)} className="hover:text-(--color-accent)">
                        {m.monthlySalary ? formatCurrency(m.monthlySalary) : "Set salary"}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2 text-(--color-text-muted)">{formatDate(m.lastSalaryPaidAt)}</td>
                  <td className="px-3 py-2">
                    {paid ? (
                      <span className="flex w-fit items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                        <CheckmarkCircle02Icon size={11} strokeWidth={1.8} />
                        Paid this month
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handlePay(m)}
                        disabled={!m.monthlySalary}
                        className="rounded-md bg-(--color-accent) px-3 py-1 text-xs font-medium text-white disabled:opacity-40"
                      >
                        Mark as Paid
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {staff.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm text-(--color-text-muted)">
                  No staff members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
