import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search01Icon,
  PlusSignIcon,
  Cancel01Icon,
  Delete02Icon,
  PauseIcon,
  CheckmarkCircle02Icon,
  Copy01Icon,
  SquareLock02Icon,
  Download04Icon,
  UserSwitchIcon,
  MailSend02Icon,
  Building06Icon,
} from "hugeicons-react";
import {
  getTenants,
  createTenant,
  updateTenant,
  toggleTenantStatus,
  deleteTenant,
  resetTenantPassword,
  bulkTenantAction,
  impersonateTenant,
  exportTenantsCsv,
  TENANT_PLANS,
} from "../lib/api";
import { startImpersonation } from "../lib/useAuth";
import Pagination from "../components/Pagination";

const PAGE_SIZE = 20;

function emptyForm() {
  return { name: "", ownerName: "", phone: "", email: "", address: "", plan: TENANT_PLANS[0] };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function formatCurrency(n) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function SuperAdminTenantsPage() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set<string>());
  const [bulkPlan, setBulkPlan] = useState(TENANT_PLANS[0]);
  const [exporting, setExporting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState("");
  const [newCredentials, setNewCredentials] = useState(null);
  const [copied, setCopied] = useState(false);

  async function refresh() {
    const result = await getTenants({ search, status, page, pageSize: PAGE_SIZE });
    setTenants(result.items);
    setTotal(result.total);
    setSelectedIds(new Set());
  }

  useEffect(() => {
    refresh();
  }, [search, status, page]);

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  function toggleSelected(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => (prev.size === tenants.length ? new Set() : new Set(tenants.map((t) => t._id))));
  }

  async function runBulkAction(action, plan = undefined) {
    if (selectedIds.size === 0) return;
    if (action === "delete" && !window.confirm(`Delete ${selectedIds.size} client(s)? This cannot be undone.`)) return;
    await bulkTenantAction(Array.from(selectedIds), action, plan);
    setSelectedIds(new Set());
    refresh();
  }

  async function handleExportCsv() {
    setExporting(true);
    try {
      const blob = await exportTenantsCsv({ search, status });
      downloadBlob(blob, `tenants-${new Date().toISOString().slice(0, 10)}.csv`);
    } finally {
      setExporting(false);
    }
  }

  async function handleImpersonate(tenant) {
    const result = await impersonateTenant(tenant._id);
    startImpersonation(result, tenant.name);
    navigate("/cafe");
  }

  async function handleCreate() {
    if (!form.name.trim() || !form.ownerName.trim() || !form.email.trim()) {
      setFormError("Name, owner and a valid email (used as their login) are required.");
      return;
    }
    setFormError("");
    try {
      const tenant = await createTenant(form);
      setForm(emptyForm());
      setShowForm(false);
      setNewCredentials({ ...tenant.staffLogin, emailSent: tenant.emailSent });
      refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not create client");
    }
  }

  function copyCredentials() {
    if (!newCredentials) return;
    navigator.clipboard.writeText(`Email: ${newCredentials.email}\nPassword: ${newCredentials.tempPassword}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleResetPassword(tenant) {
    const creds = await resetTenantPassword(tenant._id);
    setNewCredentials(creds);
  }

  async function handleToggleStatus(tenant) {
    await toggleTenantStatus(tenant._id);
    refresh();
    if (selected?._id === tenant._id) setSelected((s) => ({ ...s, status: s.status === "active" ? "suspended" : "active" }));
  }

  async function handleDelete(tenant) {
    await deleteTenant(tenant._id);
    if (selected?._id === tenant._id) setSelected(null);
    refresh();
  }

  async function handlePlanChange(tenant, plan) {
    await updateTenant(tenant._id, { plan });
    refresh();
    if (selected?._id === tenant._id) setSelected((s) => ({ ...s, plan }));
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold">
              <Building06Icon size={20} strokeWidth={1.8} />
              Cafes / Restaurants
            </h1>
            <p className="mt-1 text-sm text-(--color-text-muted)">Every client (tenant) running on this platform.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={exporting}
              className="flex items-center gap-1.5 rounded-md border border-(--color-border) px-3 py-1.5 text-sm font-medium text-(--color-text) transition-colors hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10"
            >
              <Download04Icon size={14} strokeWidth={1.8} />
              {exporting ? "Exporting…" : "Export CSV"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 rounded-md bg-(--color-accent) px-3 py-1.5 text-sm font-medium text-white"
            >
              <PlusSignIcon size={14} strokeWidth={1.8} />
              Add Client
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <div className="relative w-64">
            <Search01Icon
              size={16}
              strokeWidth={1.8}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-(--color-text-muted)"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cafe or owner name…"
              className="w-full rounded-md border border-(--color-border) bg-transparent py-1.5 pl-8 pr-3 text-sm outline-none focus:border-(--color-accent)"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-md border border-(--color-border) bg-transparent px-2 py-1.5 text-sm outline-none"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {selectedIds.size > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-(--color-accent)/30 bg-(--color-accent)/5 px-3 py-2 text-sm">
            <span className="font-medium text-(--color-text)">{selectedIds.size} selected</span>
            <button
              type="button"
              onClick={() => runBulkAction("activate")}
              className="rounded-md border border-(--color-border) px-2.5 py-1 text-xs font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10"
            >
              Activate
            </button>
            <button
              type="button"
              onClick={() => runBulkAction("suspend")}
              className="rounded-md border border-(--color-border) px-2.5 py-1 text-xs font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10"
            >
              Suspend
            </button>
            <div className="flex items-center gap-1">
              <select
                value={bulkPlan}
                onChange={(e) => setBulkPlan(e.target.value)}
                className="rounded-md border border-(--color-border) bg-transparent px-2 py-1 text-xs outline-none"
              >
                {TENANT_PLANS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => runBulkAction("plan", bulkPlan)}
                className="rounded-md border border-(--color-border) px-2.5 py-1 text-xs font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10"
              >
                Set Plan
              </button>
            </div>
            <button
              type="button"
              onClick={() => runBulkAction("delete")}
              className="rounded-md border border-red-500/30 px-2.5 py-1 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/10"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="ml-auto text-xs text-(--color-text-muted) hover:text-(--color-text)"
            >
              Clear selection
            </button>
          </div>
        )}

        <div className="mt-4 overflow-x-auto rounded-xl border border-(--color-border)">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-(--color-border) text-xs text-(--color-text-muted)">
                <th className="w-8 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={tenants.length > 0 && selectedIds.size === tenants.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-3 py-2 font-medium">Cafe / Restaurant</th>
                <th className="px-3 py-2 font-medium">Owner</th>
                <th className="px-3 py-2 font-medium">Plan</th>
                <th className="px-3 py-2 font-medium">Orders</th>
                <th className="px-3 py-2 font-medium">Revenue</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr
                  key={t._id}
                  onClick={() => setSelected(t)}
                  className="cursor-pointer border-b border-(--color-border) last:border-0 hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(t._id)} onChange={() => toggleSelected(t._id)} />
                  </td>
                  <td className="px-3 py-2 font-medium">{t.name}</td>
                  <td className="px-3 py-2 text-(--color-text-muted)">{t.ownerName}</td>
                  <td className="px-3 py-2">
                    <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-medium dark:bg-white/10">{t.plan}</span>
                  </td>
                  <td className="px-3 py-2 tabular-nums">{t.totalOrders}</td>
                  <td className="px-3 py-2 tabular-nums">{formatCurrency(t.totalRevenue)}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(t);
                      }}
                      className={`flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        t.status === "active"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-red-500/10 text-red-500"
                      }`}
                    >
                      {t.status === "active" ? (
                        <CheckmarkCircle02Icon size={11} strokeWidth={1.8} />
                      ) : (
                        <PauseIcon size={11} strokeWidth={1.8} />
                      )}
                      {t.status === "active" ? "Active" : "Suspended"}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(t);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-(--color-text-muted) transition-colors hover:bg-red-500/10 hover:text-red-500"
                    >
                      <Delete02Icon size={14} strokeWidth={1.8} />
                    </button>
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-sm text-(--color-text-muted)">
                    No clients found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      </div>

      {selected && (
        <div className="w-96 shrink-0 overflow-y-auto border-l border-(--color-border) p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{selected.name}</h2>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-(--color-text-muted) transition-colors hover:bg-black/5 hover:text-(--color-text) dark:hover:bg-white/10"
            >
              <Cancel01Icon size={16} strokeWidth={1.8} />
            </button>
          </div>
          <div className="mt-1 text-xs text-(--color-text-muted)">Client since {formatDate(selected.createdAt)}</div>

          <div className="mt-4 space-y-1.5 text-sm text-(--color-text-muted)">
            <div>Owner: <span className="text-(--color-text)">{selected.ownerName}</span></div>
            <div>Phone: <span className="text-(--color-text)">{selected.phone || "-"}</span></div>
            <div>Email: <span className="text-(--color-text)">{selected.email || "-"}</span></div>
            <div>Address: <span className="text-(--color-text)">{selected.address || "-"}</span></div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-(--color-border) p-3">
              <div className="text-lg font-semibold tabular-nums">{selected.totalOrders}</div>
              <div className="text-xs text-(--color-text-muted)">Total Orders</div>
            </div>
            <div className="rounded-xl border border-(--color-border) p-3">
              <div className="text-lg font-semibold tabular-nums">{formatCurrency(selected.totalRevenue)}</div>
              <div className="text-xs text-(--color-text-muted)">Total Revenue</div>
            </div>
            <div className="rounded-xl border border-(--color-border) p-3">
              <div className="text-lg font-semibold tabular-nums">{selected.staffCount}</div>
              <div className="text-xs text-(--color-text-muted)">Staff</div>
            </div>
            <div className="rounded-xl border border-(--color-border) p-3">
              <div className="text-sm font-medium">{formatDate(selected.planExpiry)}</div>
              <div className="text-xs text-(--color-text-muted)">Plan Expiry</div>
            </div>
          </div>

          <label className="mt-4 flex flex-col gap-1">
            <span className="text-xs text-(--color-text-muted)">Plan</span>
            <select
              value={selected.plan}
              onChange={(e) => handlePlanChange(selected, e.target.value)}
              className="rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none"
            >
              {TENANT_PLANS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => handleImpersonate(selected)}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-md bg-(--color-accent)/10 py-2 text-sm font-medium text-(--color-accent)"
          >
            <UserSwitchIcon size={15} strokeWidth={1.8} />
            Login as this Cafe
          </button>

          <button
            type="button"
            onClick={() => handleResetPassword(selected)}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-(--color-border) py-2 text-sm font-medium"
          >
            <SquareLock02Icon size={15} strokeWidth={1.8} />
            Reset Login Password
          </button>

          <button
            type="button"
            onClick={() => handleToggleStatus(selected)}
            className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium text-white ${
              selected.status === "active" ? "bg-red-500" : "bg-emerald-600"
            }`}
          >
            {selected.status === "active" ? (
              <>
                <PauseIcon size={15} strokeWidth={1.8} />
                Suspend Client
              </>
            ) : (
              <>
                <CheckmarkCircle02Icon size={15} strokeWidth={1.8} />
                Activate Client
              </>
            )}
          </button>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/30 p-4" onClick={() => setShowForm(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl border border-(--color-border) bg-(--color-canvas) p-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Add Client</h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-(--color-text-muted) transition-colors hover:bg-black/5 hover:text-(--color-text) dark:hover:bg-white/10"
              >
                <Cancel01Icon size={16} strokeWidth={1.8} />
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Cafe / Restaurant name"
                className="rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
              />
              <input
                value={form.ownerName}
                onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))}
                placeholder="Owner name"
                className="rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
              />
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="Phone"
                className="rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
              />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Email (becomes their login)"
                className="rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
              />
              <input
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Address"
                className="rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
              />
              <select
                value={form.plan}
                onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}
                className="rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none"
              >
                {TENANT_PLANS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            {formError && <div className="mt-2 text-xs text-red-500">{formError}</div>}
            <button
              type="button"
              onClick={handleCreate}
              className="mt-4 w-full rounded-md bg-(--color-accent) py-2 text-sm font-medium text-white"
            >
              Add Client
            </button>
          </div>
        </div>
      )}

      {newCredentials && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/30 p-4" onClick={() => setNewCredentials(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl border border-(--color-border) bg-(--color-canvas) p-5"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--color-accent)/10 text-(--color-accent)">
                <SquareLock02Icon size={16} strokeWidth={1.8} />
              </span>
              <h2 className="text-sm font-semibold">Client Login Credentials</h2>
            </div>
            <p className="mt-3 text-xs text-(--color-text-muted)">
              This password is shown only once and can't be retrieved later.
            </p>
            {newCredentials.emailSent ? (
              <div className="mt-2 flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                <MailSend02Icon size={13} strokeWidth={1.8} />
                Emailed to {newCredentials.email} automatically.
              </div>
            ) : (
              <div className="mt-2 rounded-md bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-600 dark:text-amber-400">
                Not emailed — configure an email provider in Settings &gt; Email / API to send this automatically
                next time. Copy and share it manually for now.
              </div>
            )}
            <div className="mt-3 space-y-2 rounded-md border border-(--color-border) p-3 text-sm">
              <div>
                <div className="text-xs text-(--color-text-muted)">Login URL</div>
                <div className="font-mono">/login/cafe</div>
              </div>
              <div>
                <div className="text-xs text-(--color-text-muted)">Email</div>
                <div className="font-mono">{newCredentials.email}</div>
              </div>
              <div>
                <div className="text-xs text-(--color-text-muted)">Temporary Password</div>
                <div className="font-mono">{newCredentials.tempPassword}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={copyCredentials}
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-md border border-(--color-border) py-2 text-sm font-medium"
            >
              <Copy01Icon size={15} strokeWidth={1.8} />
              {copied ? "Copied!" : "Copy Email & Password"}
            </button>
            <button
              type="button"
              onClick={() => setNewCredentials(null)}
              className="mt-2 w-full rounded-md bg-(--color-accent) py-2 text-sm font-medium text-white"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
