import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  Coins01Icon,
  QrCodeIcon,
  CreditCardIcon,
  SplitIcon,
  PrinterIcon,
  Download04Icon,
  CashbackIcon,
  ReceiptDollarIcon,
  StarIcon,
  Cancel01Icon,
} from "hugeicons-react";
import { getBillableOrders, completePayment, getInvoices, reprintInvoice, downloadInvoice, refundInvoice, submitInvoiceFeedback, getCustomer, getSettings, validateCoupon } from "../lib/api";
import { buildInvoiceHtml, printHtml, downloadInvoicePdf } from "../lib/print";
import Pagination from "../components/Pagination";

const INVOICE_PAGE_SIZE = 10;

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
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [invoicePage, setInvoicePage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);

  const [discountPercent, setDiscountPercent] = useState(0);
  const [serviceChargePercent, setServiceChargePercent] = useState(5);
  const [method, setMethod] = useState("cash");
  const [splitCash, setSplitCash] = useState(0);
  const [splitUpi, setSplitUpi] = useState(0);
  const [tipAmount, setTipAmount] = useState(0);
  const [splitPeople, setSplitPeople] = useState(1);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code, discountAmount }
  const [couponError, setCouponError] = useState("");
  const [upiId, setUpiId] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [upiQrDataUrl, setUpiQrDataUrl] = useState("");

  useEffect(() => {
    getSettings().then((s: any) => {
      setUpiId(s.tax?.upiId ?? "");
      setRestaurantName(s.restaurant?.name ?? "");
    });
  }, []);
  const [toast, setToast] = useState("");
  const [customerLoyalty, setCustomerLoyalty] = useState(null);
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [feedbackInvoice, setFeedbackInvoice] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackNote, setFeedbackNote] = useState("");

  async function refresh() {
    setOrders(await getBillableOrders());
    const result = await getInvoices({ page: invoicePage, pageSize: INVOICE_PAGE_SIZE });
    setInvoices(result.items);
    setInvoiceTotal(result.total);
  }

  useEffect(() => {
    refresh();
  }, [invoicePage]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const selected = orders.find((o) => o._id === selectedId) ?? null;

  const maxRedeemablePoints = customerLoyalty
    ? Math.min(customerLoyalty.loyaltyPoints, selected ? selected.amount : 0)
    : 0;

  const breakdown = useMemo(() => {
    if (!selected) return null;
    const subtotal = selected.amount;
    const percentDiscount = Math.round((subtotal * discountPercent) / 100);
    const couponDiscount = appliedCoupon ? Math.min(appliedCoupon.discountAmount, subtotal - percentDiscount) : 0;
    const pointsDiscount = Math.min(redeemPoints, maxRedeemablePoints, subtotal - percentDiscount - couponDiscount);
    const discountAmount = percentDiscount + couponDiscount + pointsDiscount;
    const serviceChargeAmount = Math.round(((subtotal - discountAmount) * serviceChargePercent) / 100);
    const taxAmount = Math.round((subtotal - discountAmount + serviceChargeAmount) * 0.05);
    const rawTotal = subtotal - discountAmount + serviceChargeAmount + taxAmount;
    const total = Math.round(rawTotal);
    const roundOff = +(total - rawTotal).toFixed(2);
    return { subtotal, discountAmount, serviceChargeAmount, taxAmount, roundOff, total, pointsDiscount, couponDiscount };
  }, [selected, discountPercent, serviceChargePercent, redeemPoints, maxRedeemablePoints, appliedCoupon]);

  const grandTotal = breakdown ? breakdown.total + Number(tipAmount || 0) : 0;
  const perPersonShare = splitPeople > 1 ? grandTotal / splitPeople : 0;

  // A static UPI deep-link QR — the customer scans and pays via their own
  // UPI app; there's no gateway/webhook here, so staff still confirms the
  // payment landed before completing it (same as any other manual method).
  useEffect(() => {
    if (method !== "upi" || !upiId || grandTotal <= 0) {
      setUpiQrDataUrl("");
      return;
    }
    const link = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(restaurantName || "Cafe")}&am=${grandTotal.toFixed(2)}&cu=INR`;
    QRCode.toDataURL(link, { width: 200, margin: 1 }).then(setUpiQrDataUrl);
  }, [method, upiId, grandTotal, restaurantName]);

  async function selectOrder(order) {
    setSelectedId(order._id);
    setDiscountPercent(0);
    setServiceChargePercent(5);
    setMethod("cash");
    setSplitCash(0);
    setSplitUpi(0);
    setRedeemPoints(0);
    setTipAmount(0);
    setSplitPeople(1);
    setCouponInput("");
    setAppliedCoupon(null);
    setCouponError("");
    setCustomerLoyalty(order.customerId ? await getCustomer(order.customerId) : null);
  }

  async function handleApplyCoupon() {
    if (!couponInput.trim() || !selected) return;
    setCouponError("");
    try {
      const result = await validateCoupon(couponInput.trim(), selected.amount);
      setAppliedCoupon({ code: result.code, discountAmount: result.discountAmount });
    } catch (err) {
      setAppliedCoupon(null);
      setCouponError(err instanceof Error ? err.message : "Invalid coupon");
    }
  }

  async function handleCompletePayment() {
    if (!selected || !breakdown) return;
    if (method === "split" && Number(splitCash) + Number(splitUpi) !== grandTotal) {
      setToast("Split amounts must add up to the total.");
      return;
    }
    const invoice = await completePayment(selected._id, {
      ...breakdown,
      method,
      tipAmount: Number(tipAmount) || 0,
      redeemPoints: breakdown.pointsDiscount,
      couponCode: appliedCoupon?.code,
      splits: method === "split" ? { cash: Number(splitCash), upi: Number(splitUpi) } : undefined,
    });
    setToast(
      invoice.pointsEarned > 0
        ? `Payment completed for ${selected.orderNumber}. Customer earned ${invoice.pointsEarned} points.`
        : `Payment completed for ${selected.orderNumber}.`
    );
    setSelectedId(null);
    setCustomerLoyalty(null);
    setRedeemPoints(0);
    setFeedbackInvoice(invoice);
    setFeedbackRating(0);
    setFeedbackNote("");
    refresh();
  }

  async function handleSubmitFeedback() {
    if (!feedbackInvoice || feedbackRating === 0) return;
    await submitInvoiceFeedback(feedbackInvoice._id, feedbackRating, feedbackNote);
    setFeedbackInvoice(null);
    refresh();
  }

  function invoiceReceipt(invoice) {
    return {
      invoiceNumber: invoice.invoiceNumber,
      orderNumber: invoice.orderNumber,
      customer: invoice.customer,
      subtotal: invoice.subtotal,
      discountAmount: invoice.discountAmount,
      serviceChargeAmount: invoice.serviceChargeAmount,
      taxAmount: invoice.taxAmount,
      total: invoice.total,
      method: invoice.method,
    };
  }

  function invoiceHtml(invoice) {
    return buildInvoiceHtml(invoiceReceipt(invoice));
  }

  async function handleReprint(invoice) {
    await reprintInvoice(invoice._id);
    printHtml(invoiceHtml(invoice));
    setToast(`Reprinting ${invoice.invoiceNumber}…`);
  }

  async function handleDownload(invoice) {
    await downloadInvoice(invoice._id);
    await downloadInvoicePdf(invoiceReceipt(invoice), `${invoice.invoiceNumber}.pdf`);
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

        <Pagination page={invoicePage} pageSize={INVOICE_PAGE_SIZE} total={invoiceTotal} onPageChange={setInvoicePage} />
      </div>

      {selected && breakdown && (
        <div className="w-96 shrink-0 overflow-y-auto border-l border-(--color-border) p-5">
          <h2 className="text-sm font-semibold">{selected.orderNumber}</h2>
          <div className="mt-1 text-xs capitalize text-(--color-text-muted)">
            {selected.orderType} {selected.table ? `· ${selected.table}` : ""} · {selected.customer}
          </div>

          <div className="mt-4">
            {appliedCoupon ? (
              <div className="flex items-center justify-between rounded-md bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                <span>Coupon {appliedCoupon.code} applied (-{formatCurrency(appliedCoupon.discountAmount)})</span>
                <button type="button" onClick={() => setAppliedCoupon(null)} className="font-medium underline">
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <input
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="Coupon code"
                  className="flex-1 rounded-md border border-(--color-border) bg-transparent px-2 py-1.5 text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  className="rounded-md border border-(--color-border) px-2.5 py-1.5 text-xs font-medium"
                >
                  Apply
                </button>
              </div>
            )}
            {couponError && <p className="mt-1 text-xs text-red-500">{couponError}</p>}
          </div>

          <div className="mt-3 flex items-center justify-between text-sm">
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

          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-(--color-text-muted)">Tip</span>
            <div className="flex items-center gap-1">
              <span className="text-(--color-text-muted)">₹</span>
              <input
                type="number"
                min={0}
                value={tipAmount}
                onChange={(e) => setTipAmount(Math.max(0, Number(e.target.value)))}
                className="w-20 rounded-md border border-(--color-border) bg-transparent px-2 py-1 text-right text-sm outline-none"
              />
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-(--color-text-muted)">Split between</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                max={20}
                value={splitPeople}
                onChange={(e) => setSplitPeople(Math.min(20, Math.max(1, Number(e.target.value))))}
                className="w-14 rounded-md border border-(--color-border) bg-transparent px-2 py-1 text-right text-sm outline-none"
              />
              <span className="text-(--color-text-muted)">people</span>
            </div>
          </div>
          {splitPeople > 1 && (
            <div className="mt-1 rounded-md bg-(--color-accent)/10 px-2.5 py-1.5 text-xs text-(--color-accent)">
              {formatCurrency(perPersonShare)} per person ({splitPeople} people) — bill stays one invoice, this is just a split calculator.
            </div>
          )}

          {customerLoyalty && (
            <div className="mt-3 rounded-md border border-(--color-border) p-2.5">
              <div className="flex items-center justify-between text-xs text-(--color-text-muted)">
                <span className="flex items-center gap-1">
                  <CashbackIcon size={13} strokeWidth={1.8} />
                  {customerLoyalty.name} has {customerLoyalty.loyaltyPoints} points
                </span>
              </div>
              {maxRedeemablePoints > 0 && (
                <div className="mt-1.5 flex items-center justify-between text-sm">
                  <span className="text-(--color-text-muted)">Redeem points (1pt = ₹1)</span>
                  <input
                    type="number"
                    min={0}
                    max={maxRedeemablePoints}
                    value={redeemPoints}
                    onChange={(e) => setRedeemPoints(Math.min(maxRedeemablePoints, Math.max(0, Number(e.target.value))))}
                    className="w-16 rounded-md border border-(--color-border) bg-transparent px-2 py-1 text-right text-sm outline-none"
                  />
                </div>
              )}
            </div>
          )}

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
            {tipAmount > 0 && (
              <div className="flex justify-between text-(--color-text-muted)">
                <span>Tip</span>
                <span className="tabular-nums">+{formatCurrency(tipAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(grandTotal)}</span>
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

          {method === "upi" && (
            <div className="mt-3 flex flex-col items-center gap-2 rounded-md border border-(--color-border) p-3">
              {upiQrDataUrl ? (
                <>
                  <img src={upiQrDataUrl} alt="UPI payment QR" className="rounded-md" />
                  <p className="text-center text-xs text-(--color-text-muted)">
                    Customer scans and pays {formatCurrency(grandTotal)}. Confirm it landed before completing.
                  </p>
                </>
              ) : (
                <p className="text-center text-xs text-(--color-text-muted)">
                  Set a UPI ID in Settings → GST/Tax to show a payment QR here.
                </p>
              )}
            </div>
          )}

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

      {feedbackInvoice && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/30 p-4" onClick={() => setFeedbackInvoice(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl border border-(--color-border) bg-(--color-canvas) p-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">How was the experience?</h2>
              <button
                type="button"
                onClick={() => setFeedbackInvoice(null)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-(--color-text-muted) transition-colors hover:bg-black/5 hover:text-(--color-text) dark:hover:bg-white/10"
              >
                <Cancel01Icon size={16} strokeWidth={1.8} />
              </button>
            </div>
            <p className="mt-1 text-xs text-(--color-text-muted)">
              Hand the screen to the customer — takes 5 seconds. {feedbackInvoice.invoiceNumber}
            </p>

            <div className="mt-4 flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setFeedbackRating(n)}
                  className="text-amber-400 transition-transform hover:scale-110"
                >
                  <StarIcon size={32} strokeWidth={1.8} className={n <= feedbackRating ? "fill-amber-400" : "fill-transparent"} />
                </button>
              ))}
            </div>

            <textarea
              value={feedbackNote}
              onChange={(e) => setFeedbackNote(e.target.value)}
              placeholder="Anything to share? (optional)"
              rows={2}
              className="mt-4 w-full resize-none rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
            />

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setFeedbackInvoice(null)}
                className="flex-1 rounded-md border border-(--color-border) py-2 text-sm font-medium text-(--color-text-muted)"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={handleSubmitFeedback}
                disabled={feedbackRating === 0}
                className="flex-1 rounded-md bg-(--color-accent) py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
