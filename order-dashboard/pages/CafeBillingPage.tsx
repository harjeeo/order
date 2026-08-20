import { useEffect, useMemo, useState } from "react";
import {
  Coins01Icon,
  QrCodeIcon,
  CreditCardIcon,
  SplitIcon,
  PrinterIcon,
  Download04Icon,
  CashbackIcon,
  ReceiptDollarIcon,
} from "hugeicons-react";
import { getBillableOrders, completePayment, getInvoices, reprintInvoice, downloadInvoice, refundInvoice } from "../lib/mockApi";

const METHODS = [
  { key: "cash", label: "Cash", icon: Coins01Icon },
  { key: "upi", label: "UPI", icon: QrCodeIcon },
  { key: "card", label: "Card", icon: CreditCardIcon },
  { key: "split", label: "Split", icon: SplitIcon },
];

function formatCurrency(n) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function CafeBillingPage() {
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const [discountPercent, setDiscountPercent] = useState(0);
  const [serviceChargePercent, setServiceChargePercent] = useState(5);
  const [method, setMethod] = useState("cash");
  const [splitCash, setSplitCash] = useState(0);
  const [splitUpi, setSplitUpi] = useState(0);
  const [toast, setToast] = useState("");

  async function refresh() {
    setOrders(await getBillableOrders());
    setInvoices(await getInvoices());
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const selected = orders.find((o) => o._id === selectedId) ?? null;

  const breakdown = useMemo(() => {
    if (!selected) return null;
    const subtotal = selected.amount;
    const discountAmount = Math.round((subtotal * discountPercent) / 100);
    const serviceChargeAmount = Math.round(((subtotal - discountAmount) * serviceChargePercent) / 100);
    const taxAmount = Math.round((subtotal - discountAmount + serviceChargeAmount) * 0.05);
    const rawTotal = subtotal - discountAmount + serviceChargeAmount + taxAmount;
    const total = Math.round(rawTotal);
    const roundOff = +(total - rawTotal).toFixed(2);
    return { subtotal, discountAmount, serviceChargeAmount, taxAmount, roundOff, total };
  }, [selected, discountPercent, serviceChargePercent]);

  function selectOrder(order) {
    setSelectedId(order._id);
    setDiscountPercent(0);
    setServiceChargePercent(5);
    setMethod("cash");
    setSplitCash(0);
    setSplitUpi(0);
  }

  async function handleCompletePayment() {
    if (!selected || !breakdown) return;
    if (method === "split" && Number(splitCash) + Number(splitUpi) !== breakdown.total) {
      setToast("Split amounts must add up to the total.");
      return;
    }
    await completePayment(selected._id, {
      ...breakdown,
      method,
      splits: method === "split" ? { cash: Number(splitCash), upi: Number(splitUpi) } : undefined,
    });
    setToast(`Payment completed for ${selected.orderNumber}.`);
    setSelectedId(null);
    refresh();
  }

  async function handleReprint(invoice) {
    await reprintInvoice(invoice._id);
    setToast(`Reprinting ${invoice.invoiceNumber}…`);
  }

  async function handleDownload(invoice) {
    await downloadInvoice(invoice._id);
    setToast(`Downloading ${invoice.invoiceNumber}…`);
  }

  async function handleRefund(invoice) {
    await refundInvoice(invoice._id);
    setToast(`${invoice.invoiceNumber} refunded.`);
    refresh();
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <h1 className="text-2xl font-semibold">Billing & Payments</h1>
        <p className="mt-1 text-sm text-(--color-text-muted)">Bills pending payment.</p>

        {toast && (
          <div className="mt-3 inline-block rounded-md bg-(--color-accent)/10 px-3 py-1.5 text-xs text-(--color-accent)">
            {toast}
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {orders.map((o) => (
            <button
              key={o._id}
              type="button"
              onClick={() => selectOrder(o)}
              className={`rounded-xl border p-3 text-left transition-colors ${
                selectedId === o._id ? "border-(--color-accent) bg-(--color-accent)/5" : "border-(--color-border)"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{o.orderNumber}</span>
                <span className="tabular-nums text-sm">{formatCurrency(o.amount)}</span>
              </div>
              <div className="mt-1 text-xs capitalize text-(--color-text-muted)">
                {o.orderType} {o.table ? `· ${o.table}` : ""} · {o.customer}
              </div>
            </button>
          ))}
          {orders.length === 0 && (
            <div className="col-span-full py-8 text-center text-sm text-(--color-text-muted)">
              No bills pending payment.
            </div>
          )}
        </div>

        <h2 className="mt-8 flex items-center gap-1.5 text-sm font-medium text-(--color-text-muted)">
          <ReceiptDollarIcon size={14} strokeWidth={1.8} />
          Recent Invoices
        </h2>
        <div className="mt-2 overflow-x-auto rounded-xl border border-(--color-border)">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-(--color-border) text-xs text-(--color-text-muted)">
                <th className="px-3 py-2 font-medium">Invoice #</th>
                <th className="px-3 py-2 font-medium">Order #</th>
                <th className="px-3 py-2 font-medium">Customer</th>
                <th className="px-3 py-2 font-medium">Method</th>
                <th className="px-3 py-2 font-medium">Amount</th>
                <th className="px-3 py-2 font-medium">Time</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv._id} className="border-b border-(--color-border) last:border-0">
                  <td className="px-3 py-2 font-medium">{inv.invoiceNumber}</td>
                  <td className="px-3 py-2 text-(--color-text-muted)">{inv.orderNumber}</td>
                  <td className="px-3 py-2">{inv.customer}</td>
                  <td className="px-3 py-2 uppercase text-(--color-text-muted)">{inv.method}</td>
                  <td className="px-3 py-2 tabular-nums">{formatCurrency(inv.total)}</td>
                  <td className="px-3 py-2 text-(--color-text-muted)">{formatTime(inv.createdAt)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleReprint(inv)}
                        title="Reprint Invoice"
                        className="flex h-7 w-7 items-center justify-center rounded-md text-(--color-text-muted) transition-colors hover:bg-black/5 hover:text-(--color-text) dark:hover:bg-white/10"
                      >
                        <PrinterIcon size={15} strokeWidth={1.8} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownload(inv)}
                        title="Download Invoice"
                        className="flex h-7 w-7 items-center justify-center rounded-md text-(--color-text-muted) transition-colors hover:bg-black/5 hover:text-(--color-text) dark:hover:bg-white/10"
                      >
                        <Download04Icon size={15} strokeWidth={1.8} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRefund(inv)}
                        title="Refund"
                        disabled={inv.refunded}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-(--color-text-muted) transition-colors hover:bg-black/5 hover:text-(--color-text) disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-white/10"
                      >
                        <CashbackIcon size={15} strokeWidth={1.8} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-sm text-(--color-text-muted)">
                    No invoices yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && breakdown && (
        <div className="w-96 shrink-0 overflow-y-auto border-l border-(--color-border) p-5">
          <h2 className="text-sm font-semibold">{selected.orderNumber}</h2>
          <div className="mt-1 text-xs capitalize text-(--color-text-muted)">
            {selected.orderType} {selected.table ? `· ${selected.table}` : ""} · {selected.customer}
          </div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-(--color-text-muted)">Discount</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={100}
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value))))}
                className="w-14 rounded-md border border-(--color-border) bg-transparent px-2 py-1 text-right text-sm outline-none"
              />
              <span className="text-(--color-text-muted)">%</span>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-(--color-text-muted)">Service Charge</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={100}
                value={serviceChargePercent}
                onChange={(e) => setServiceChargePercent(Math.min(100, Math.max(0, Number(e.target.value))))}
                className="w-14 rounded-md border border-(--color-border) bg-transparent px-2 py-1 text-right text-sm outline-none"
              />
              <span className="text-(--color-text-muted)">%</span>
            </div>
          </div>

          <div className="mt-3 space-y-1 border-t border-(--color-border) pt-3 text-sm">
            <div className="flex justify-between text-(--color-text-muted)">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatCurrency(breakdown.subtotal)}</span>
            </div>
            <div className="flex justify-between text-(--color-text-muted)">
              <span>Discount</span>
              <span className="tabular-nums">-{formatCurrency(breakdown.discountAmount)}</span>
            </div>
            <div className="flex justify-between text-(--color-text-muted)">
              <span>Service Charge</span>
              <span className="tabular-nums">{formatCurrency(breakdown.serviceChargeAmount)}</span>
            </div>
            <div className="flex justify-between text-(--color-text-muted)">
              <span>Tax (5%)</span>
              <span className="tabular-nums">{formatCurrency(breakdown.taxAmount)}</span>
            </div>
            <div className="flex justify-between text-(--color-text-muted)">
              <span>Round Off</span>
              <span className="tabular-nums">{breakdown.roundOff >= 0 ? "+" : ""}{breakdown.roundOff}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(breakdown.total)}</span>
            </div>
          </div>

          <div className="mt-4 text-xs font-medium text-(--color-text-muted)">Payment Method</div>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {METHODS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setMethod(key)}
                className={`flex flex-col items-center gap-1 rounded-md border py-2 text-[11px] ${
                  method === key ? "border-(--color-accent) bg-(--color-accent)/10 text-(--color-accent)" : "border-(--color-border) text-(--color-text-muted)"
                }`}
              >
                <Icon size={16} strokeWidth={1.8} />
                {label}
              </button>
            ))}
          </div>

          {method === "split" && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1">
                <label className="text-xs text-(--color-text-muted)">Cash</label>
                <input
                  type="number"
                  value={splitCash}
                  onChange={(e) => setSplitCash(Number(e.target.value))}
                  className="mt-1 w-full rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-(--color-text-muted)">UPI</label>
                <input
                  type="number"
                  value={splitUpi}
                  onChange={(e) => setSplitUpi(Number(e.target.value))}
                  className="mt-1 w-full rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none"
                />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleCompletePayment}
            className="mt-5 w-full rounded-md bg-(--color-accent) py-2.5 text-sm font-medium text-white"
          >
            Complete Payment & Generate Invoice
          </button>
        </div>
      )}
    </div>
  );
}
