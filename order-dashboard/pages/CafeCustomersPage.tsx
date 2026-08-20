import { useEffect, useState } from "react";
import { Search01Icon, PlusSignIcon, Edit02Icon, Mail01Icon, Call02Icon, MapPinIcon, Cancel01Icon, Delete02Icon } from "hugeicons-react";
import { getCustomers, getCustomerOrderHistory, createCustomer, updateCustomer, deleteCustomer } from "../lib/api";
import Avatar from "../components/Avatar";
import Pagination from "../components/Pagination";

const PAGE_SIZE = 20;

function emptyForm() {
  return { name: "", phone: "", email: "", address: "" };
}

function formatCurrency(n) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function formatDate(iso) {
  return iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-";
}

export default function CafeCustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [editingId, setEditingId] = useState(null); // "new" | customerId | null
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState("");

  async function refresh() {
    const result = await getCustomers({ search, page, pageSize: PAGE_SIZE });
    setCustomers(result.items);
    setTotal(result.total);
  }

  useEffect(() => {
    refresh();
  }, [search, page]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  async function openCustomer(customer) {
    setSelected(customer);
    setHistory(await getCustomerOrderHistory(customer._id));
  }

  function startCreate() {
    setEditingId("new");
    setFormError("");
    setForm(emptyForm());
  }

  function startEdit(customer) {
    setEditingId(customer._id);
    setFormError("");
    setForm({ name: customer.name, phone: customer.phone ?? "", email: customer.email ?? "", address: customer.address ?? "" });
  }

  function closeForm() {
    setEditingId(null);
    setFormError("");
  }

  async function handleSaveCustomer() {
    if (!form.name.trim()) {
      setFormError("Name is required.");
      return;
    }
    setFormError("");
    try {
      if (editingId === "new") {
        await createCustomer(form);
      } else {
        const updated = await updateCustomer(editingId, form);
        if (selected?._id === editingId) setSelected((s) => ({ ...s, ...updated }));
      }
      closeForm();
      refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save customer");
    }
  }

  async function handleDelete(customer) {
    await deleteCustomer(customer._id);
    if (selected?._id === customer._id) setSelected(null);
    refresh();
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Customers</h1>
            <p className="mt-1 text-sm text-(--color-text-muted)">Contacts, order history and lifetime spend.</p>
          </div>
          <button
            type="button"
            onClick={startCreate}
            className="flex items-center gap-1.5 rounded-md bg-(--color-accent) px-3 py-1.5 text-sm font-medium text-white"
          >
            <PlusSignIcon size={14} strokeWidth={1.8} />
            Add Customer
          </button>
        </div>

        <div className="relative mt-4 w-72">
          <Search01Icon
            size={16}
            strokeWidth={1.8}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-(--color-text-muted)"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or phone…"
            className="w-full rounded-md border border-(--color-border) bg-transparent py-1.5 pl-8 pr-3 text-sm outline-none focus:border-(--color-accent)"
          />
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-(--color-border)">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-(--color-border) text-xs text-(--color-text-muted)">
                <th className="px-3 py-2 font-medium">Customer</th>
                <th className="px-3 py-2 font-medium">Phone</th>
                <th className="px-3 py-2 font-medium">Total Orders</th>
                <th className="px-3 py-2 font-medium">Total Spent</th>
                <th className="px-3 py-2 font-medium">Last Order</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr
                  key={c._id}
                  onClick={() => openCustomer(c)}
                  className="cursor-pointer border-b border-(--color-border) last:border-0 hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Avatar name={c.name} size={24} />
                      <span className="font-medium">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-(--color-text-muted)">{c.phone || "-"}</td>
                  <td className="px-3 py-2 tabular-nums">{c.totalOrders}</td>
                  <td className="px-3 py-2 tabular-nums">{formatCurrency(c.totalSpent)}</td>
                  <td className="px-3 py-2 text-(--color-text-muted)">{formatDate(c.lastOrderAt)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(c);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-(--color-text-muted) transition-colors hover:bg-black/5 hover:text-(--color-text) dark:hover:bg-white/10"
                      >
                        <Edit02Icon size={14} strokeWidth={1.8} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(c);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-(--color-text-muted) transition-colors hover:bg-red-500/10 hover:text-red-500"
                      >
                        <Delete02Icon size={14} strokeWidth={1.8} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-(--color-text-muted)">
                    No customers found.
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
            <div className="flex items-center gap-2">
              <Avatar name={selected.name} size={32} />
              <div>
                <div className="text-sm font-semibold">{selected.name}</div>
                <div className="text-xs text-(--color-text-muted)">{selected.totalOrders} orders</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => startEdit(selected)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-(--color-text-muted) transition-colors hover:bg-black/5 hover:text-(--color-text) dark:hover:bg-white/10"
              >
                <Edit02Icon size={16} strokeWidth={1.8} />
              </button>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-(--color-text-muted) transition-colors hover:bg-black/5 hover:text-(--color-text) dark:hover:bg-white/10"
              >
                <Cancel01Icon size={16} strokeWidth={1.8} />
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-1.5 text-sm text-(--color-text-muted)">
            <div className="flex items-center gap-1.5">
              <Call02Icon size={13} strokeWidth={1.8} />
              {selected.phone || "-"}
            </div>
            <div className="flex items-center gap-1.5">
              <Mail01Icon size={13} strokeWidth={1.8} />
              {selected.email || "-"}
            </div>
            <div className="flex items-center gap-1.5">
              <MapPinIcon size={13} strokeWidth={1.8} />
              {selected.address || "-"}
            </div>
          </div>

          <div className="mt-4 rounded-md bg-(--color-accent)/10 px-3 py-2 text-sm text-(--color-accent)">
            Total Spent: {formatCurrency(selected.totalSpent)}
          </div>

          <h3 className="mt-5 text-xs font-medium text-(--color-text-muted)">Order History</h3>
          <div className="mt-2 flex flex-col gap-2">
            {history.map((o) => (
              <div key={o._id} className="rounded-md border border-(--color-border) p-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{o.orderNumber}</span>
                  <span className="tabular-nums">{formatCurrency(o.amount)}</span>
                </div>
                <div className="mt-0.5 text-xs capitalize text-(--color-text-muted)">
                  {formatDate(o.createdAt)} · {o.status}
                </div>
              </div>
            ))}
            {history.length === 0 && <div className="text-xs text-(--color-text-muted)">No orders yet.</div>}
          </div>
        </div>
      )}

      {editingId && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/30 p-4" onClick={closeForm}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl border border-(--color-border) bg-(--color-canvas) p-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">{editingId === "new" ? "Add Customer" : "Edit Customer"}</h2>
              <button
                type="button"
                onClick={closeForm}
                className="flex h-7 w-7 items-center justify-center rounded-md text-(--color-text-muted) transition-colors hover:bg-black/5 hover:text-(--color-text) dark:hover:bg-white/10"
              >
                <Cancel01Icon size={16} strokeWidth={1.8} />
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Name"
                className="rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
              />
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="Mobile number"
                className="rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
              />
              <input
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Email"
                className="rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
              />
              <input
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Address"
                className="rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
              />
            </div>
            {formError && <div className="mt-2 text-xs text-red-500">{formError}</div>}
            <button
              type="button"
              onClick={handleSaveCustomer}
              className="mt-4 w-full rounded-md bg-(--color-accent) py-2 text-sm font-medium text-white"
            >
              {editingId === "new" ? "Add Customer" : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
