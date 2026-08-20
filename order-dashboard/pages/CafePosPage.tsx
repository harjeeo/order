import { useEffect, useMemo, useState } from "react";
import {
  Search01Icon,
  Store01Icon,
  ShoppingBag01Icon,
  TruckDeliveryIcon,
  RestaurantTableIcon,
  UserIcon,
  Add01Icon,
  MinusSignIcon,
  Delete02Icon,
  StickyNote01Icon,
  PauseIcon,
  SentIcon,
  PrinterIcon,
  CreditCardIcon,
  Cancel01Icon,
} from "hugeicons-react";
import {
  getMenuCategories,
  getMenuItems,
  getTables,
  getCustomersList,
  submitOrder,
} from "../lib/mockApi";
import { buildKotHtml, buildInvoiceHtml, printHtml } from "../lib/print";

const ORDER_TYPES = [
  { key: "dine-in", label: "Dine-In", icon: Store01Icon },
  { key: "takeaway", label: "Takeaway", icon: ShoppingBag01Icon },
  { key: "delivery", label: "Delivery", icon: TruckDeliveryIcon },
];

function formatCurrency(n) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function lineTotal(line) {
  const addonsTotal = line.addons.reduce((s, a) => s + a.price, 0);
  return (line.unitPrice + addonsTotal) * line.qty;
}

export default function CafePosPage() {
  const [categories, setCategories] = useState(["All"]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState([]);

  const [tables, setTables] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [orderType, setOrderType] = useState("dine-in");
  const [tableId, setTableId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);

  const [cart, setCart] = useState([]);
  const [configuring, setConfiguring] = useState(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    getMenuCategories().then(setCategories);
    getTables().then(setTables);
    getCustomersList().then(setCustomers);
  }, []);

  useEffect(() => {
    getMenuItems({ category: activeCategory, search }).then(setItems);
  }, [activeCategory, search]);

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(""), 2500);
    return () => clearTimeout(t);
  }, [status]);

  function openConfigure(item) {
    if (!item.available) return;
    setConfiguring({
      item,
      variant: item.variants[0] ?? null,
      addons: [],
      qty: 1,
      notes: "",
    });
  }

  function toggleAddon(addon) {
    setConfiguring((c) => {
      const exists = c.addons.some((a) => a.name === addon.name);
      return {
        ...c,
        addons: exists ? c.addons.filter((a) => a.name !== addon.name) : [...c.addons, addon],
      };
    });
  }

  function addConfiguredToCart() {
    if (!configuring) return;
    const { item, variant, addons, qty, notes } = configuring;
    const unitPrice = variant ? variant.price : item.price;
    setCart((prev) => [
      ...prev,
      {
        id: `${item._id}-${Date.now()}`,
        itemId: item._id,
        name: variant ? `${item.name} (${variant.name})` : item.name,
        unitPrice,
        qty,
        addons,
        notes,
      },
    ]);
    setConfiguring(null);
  }

  function updateQty(lineId, delta) {
    setCart((prev) =>
      prev
        .map((l) => (l.id === lineId ? { ...l, qty: Math.max(1, l.qty + delta) } : l))
        .filter((l) => l.qty > 0)
    );
  }

  function removeLine(lineId) {
    setCart((prev) => prev.filter((l) => l.id !== lineId));
  }

  const subtotal = useMemo(() => cart.reduce((s, l) => s + lineTotal(l), 0), [cart]);
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = Math.round(taxableAmount * 0.05);
  const total = taxableAmount + taxAmount;

  function buildOrderPayload(extra = {}) {
    return {
      orderType,
      tableId: orderType === "dine-in" ? tableId : null,
      customerId,
      notes: orderNotes,
      items: cart,
      subtotal,
      discountPercent,
      discountAmount,
      taxAmount,
      total,
      ...extra,
    };
  }

  async function handleAction(action) {
    if (cart.length === 0) {
      setStatus("Add at least one item to the cart first.");
      return;
    }
    if (orderType === "dine-in" && !tableId) {
      setStatus("Select a table for a dine-in order.");
      return;
    }
    await submitOrder(buildOrderPayload({ action }));

    if (action === "kitchen" || action === "kot") {
      const table = tables.find((t) => t._id === tableId);
      printHtml(
        buildKotHtml({
          orderNumber: `Order-${Date.now().toString().slice(-6)}`,
          table: table?.number,
          orderType,
          items: cart.map((line) => ({ name: line.name, qty: line.qty, notes: line.notes })),
          notes: orderNotes,
        })
      );
    }
    if (action === "bill") {
      printHtml(
        buildInvoiceHtml({
          invoiceNumber: `Bill-${Date.now().toString().slice(-6)}`,
          items: cart.map((line) => ({ name: line.name, qty: line.qty })),
          subtotal,
          discountAmount,
          taxAmount,
          total,
        })
      );
    }

    const messages = {
      save: "Order saved.",
      hold: "Order put on hold.",
      kitchen: "Order sent to kitchen.",
      kot: "KOT printed.",
      bill: "Bill printed.",
      payment: "Payment completed.",
    };
    setStatus(messages[action] ?? "Done.");
    if (action === "payment") {
      setCart([]);
      setTableId("");
      setCustomerId("");
      setOrderNotes("");
      setDiscountPercent(0);
    }
  }

  function handleCancel() {
    setCart([]);
    setTableId("");
    setCustomerId("");
    setOrderNotes("");
    setDiscountPercent(0);
    setStatus("Order cancelled.");
  }

  return (
    <div className="flex h-full">
      {/* Menu / product selection */}
      <div className="flex flex-1 flex-col overflow-hidden border-r border-(--color-border)">
        <div className="flex items-center gap-3 border-b border-(--color-border) px-6 py-4">
          {ORDER_TYPES.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setOrderType(key)}
              className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                orderType === key
                  ? "border-(--color-accent) bg-(--color-accent)/10 font-medium text-(--color-accent)"
                  : "border-(--color-border) text-(--color-text-muted) hover:bg-black/5 dark:hover:bg-white/10"
              }`}
            >
              <Icon size={16} strokeWidth={1.8} />
              {label}
            </button>
          ))}

          <div className="relative ml-auto w-64">
            <Search01Icon
              size={16}
              strokeWidth={1.8}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-(--color-text-muted)"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items…"
              className="w-full rounded-md border border-(--color-border) bg-transparent py-1.5 pl-8 pr-3 text-sm outline-none focus:border-(--color-accent)"
            />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-(--color-border) px-6 py-3">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setActiveCategory(c)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeCategory === c
                  ? "bg-(--color-accent) text-white"
                  : "bg-black/5 text-(--color-text-muted) hover:bg-black/10 dark:bg-white/10"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <button
                key={item._id}
                type="button"
                disabled={!item.available}
                onClick={() => openConfigure(item)}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  item.available
                    ? "border-(--color-border) hover:border-(--color-accent)"
                    : "cursor-not-allowed border-(--color-border) opacity-50"
                }`}
              >
                <div className="text-sm font-medium">{item.name}</div>
                <div className="mt-1 text-xs text-(--color-text-muted)">
                  {item.variants.length > 0
                    ? `From ${formatCurrency(Math.min(...item.variants.map((v) => v.price)))}`
                    : formatCurrency(item.price)}
                </div>
                {!item.available && (
                  <div className="mt-1 text-[10px] font-medium text-red-500">Out of Stock</div>
                )}
              </button>
            ))}
            {items.length === 0 && (
              <div className="col-span-full py-8 text-center text-sm text-(--color-text-muted)">
                No items found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cart / order panel */}
      <div className="flex w-96 shrink-0 flex-col overflow-hidden">
        {configuring ? (
          <div className="flex flex-1 flex-col overflow-y-auto p-5">
            <h2 className="text-sm font-semibold">{configuring.item.name}</h2>

            {configuring.item.variants.length > 0 && (
              <div className="mt-4">
                <div className="text-xs font-medium text-(--color-text-muted)">Variant</div>
                <div className="mt-2 flex flex-col gap-1.5">
                  {configuring.item.variants.map((v) => (
                    <button
                      key={v.name}
                      type="button"
                      onClick={() => setConfiguring((c) => ({ ...c, variant: v }))}
                      className={`flex items-center justify-between rounded-md border px-3 py-1.5 text-sm ${
                        configuring.variant?.name === v.name
                          ? "border-(--color-accent) bg-(--color-accent)/10"
                          : "border-(--color-border)"
                      }`}
                    >
                      <span>{v.name}</span>
                      <span className="tabular-nums text-(--color-text-muted)">{formatCurrency(v.price)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {configuring.item.addons.length > 0 && (
              <div className="mt-4">
                <div className="text-xs font-medium text-(--color-text-muted)">Add-ons</div>
                <div className="mt-2 flex flex-col gap-1.5">
                  {configuring.item.addons.map((a) => {
                    const active = configuring.addons.some((x) => x.name === a.name);
                    return (
                      <button
                        key={a.name}
                        type="button"
                        onClick={() => toggleAddon(a)}
                        className={`flex items-center justify-between rounded-md border px-3 py-1.5 text-sm ${
                          active ? "border-(--color-accent) bg-(--color-accent)/10" : "border-(--color-border)"
                        }`}
                      >
                        <span>{a.name}</span>
                        <span className="tabular-nums text-(--color-text-muted)">+{formatCurrency(a.price)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-4">
              <div className="text-xs font-medium text-(--color-text-muted)">Quantity</div>
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setConfiguring((c) => ({ ...c, qty: Math.max(1, c.qty - 1) }))}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-(--color-border)"
                >
                  <MinusSignIcon size={14} strokeWidth={1.8} />
                </button>
                <span className="w-6 text-center tabular-nums">{configuring.qty}</span>
                <button
                  type="button"
                  onClick={() => setConfiguring((c) => ({ ...c, qty: c.qty + 1 }))}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-(--color-border)"
                >
                  <Add01Icon size={14} strokeWidth={1.8} />
                </button>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs font-medium text-(--color-text-muted)">Special Instructions</div>
              <textarea
                value={configuring.notes}
                onChange={(e) => setConfiguring((c) => ({ ...c, notes: e.target.value }))}
                placeholder="e.g. less spicy, no onions…"
                rows={2}
                className="mt-2 w-full resize-none rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
              />
            </div>

            <div className="mt-auto flex gap-2 pt-5">
              <button
                type="button"
                onClick={() => setConfiguring(null)}
                className="flex-1 rounded-md border border-(--color-border) py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addConfiguredToCart}
                className="flex-1 rounded-md bg-(--color-accent) py-2 text-sm font-medium text-white"
              >
                Add to Cart
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col overflow-y-auto p-5">
            {orderType === "dine-in" && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-(--color-text-muted)">
                  <RestaurantTableIcon size={14} strokeWidth={1.8} />
                  Table
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {tables.map((t) => (
                    <button
                      key={t._id}
                      type="button"
                      disabled={t.status !== "available" && t._id !== tableId}
                      onClick={() => setTableId(t._id)}
                      className={`rounded-md border px-2 py-1.5 text-xs ${
                        tableId === t._id
                          ? "border-(--color-accent) bg-(--color-accent)/10 font-medium"
                          : t.status === "available"
                            ? "border-(--color-border)"
                            : "cursor-not-allowed border-(--color-border) opacity-40"
                      }`}
                    >
                      {t.number}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4">
              <div className="flex items-center gap-1.5 text-xs font-medium text-(--color-text-muted)">
                <UserIcon size={14} strokeWidth={1.8} />
                Customer
              </div>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="mt-2 w-full rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
              >
                <option value="">Walk-in Customer</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-5 flex-1">
              <div className="text-xs font-medium text-(--color-text-muted)">Cart ({cart.length})</div>
              <div className="mt-2 flex flex-col gap-2">
                {cart.length === 0 && (
                  <div className="rounded-md border border-dashed border-(--color-border) py-6 text-center text-xs text-(--color-text-muted)">
                    No items yet. Tap a menu item to add it.
                  </div>
                )}
                {cart.map((line) => (
                  <div key={line.id} className="rounded-md border border-(--color-border) p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium">{line.name}</div>
                        {line.addons.length > 0 && (
                          <div className="text-[11px] text-(--color-text-muted)">
                            + {line.addons.map((a) => a.name).join(", ")}
                          </div>
                        )}
                        {line.notes && (
                          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-(--color-text-muted)">
                            <StickyNote01Icon size={11} strokeWidth={1.8} />
                            {line.notes}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLine(line.id)}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-(--color-text-muted) transition-colors hover:bg-red-500/10 hover:text-red-500"
                      >
                        <Delete02Icon size={14} strokeWidth={1.8} />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateQty(line.id, -1)}
                          className="flex h-6 w-6 items-center justify-center rounded border border-(--color-border)"
                        >
                          <MinusSignIcon size={12} strokeWidth={1.8} />
                        </button>
                        <span className="w-4 text-center text-xs tabular-nums">{line.qty}</span>
                        <button
                          type="button"
                          onClick={() => updateQty(line.id, 1)}
                          className="flex h-6 w-6 items-center justify-center rounded border border-(--color-border)"
                        >
                          <Add01Icon size={12} strokeWidth={1.8} />
                        </button>
                      </div>
                      <div className="text-sm tabular-nums">{formatCurrency(lineTotal(line))}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <textarea
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Order notes…"
                rows={1}
                className="w-full resize-none rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
              />
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
                  className="w-14 rounded-md border border-(--color-border) bg-transparent px-2 py-1 text-right text-sm outline-none focus:border-(--color-accent)"
                />
                <span className="text-(--color-text-muted)">%</span>
              </div>
            </div>

            <div className="mt-3 space-y-1 border-t border-(--color-border) pt-3 text-sm">
              <div className="flex justify-between text-(--color-text-muted)">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-(--color-text-muted)">
                <span>Discount</span>
                <span className="tabular-nums">-{formatCurrency(discountAmount)}</span>
              </div>
              <div className="flex justify-between text-(--color-text-muted)">
                <span>Tax (5%)</span>
                <span className="tabular-nums">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{formatCurrency(total)}</span>
              </div>
            </div>

            {status && (
              <div className="mt-3 rounded-md bg-(--color-accent)/10 px-3 py-2 text-xs text-(--color-accent)">
                {status}
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleAction("save")}
                className="rounded-md border border-(--color-border) py-2 text-xs font-medium"
              >
                Save Order
              </button>
              <button
                type="button"
                onClick={() => handleAction("hold")}
                className="flex items-center justify-center gap-1 rounded-md border border-(--color-border) py-2 text-xs font-medium"
              >
                <PauseIcon size={13} strokeWidth={1.8} />
                Hold
              </button>
              <button
                type="button"
                onClick={() => handleAction("kitchen")}
                className="flex items-center justify-center gap-1 rounded-md border border-(--color-border) py-2 text-xs font-medium"
              >
                <SentIcon size={13} strokeWidth={1.8} />
                Send to Kitchen
              </button>
              <button
                type="button"
                onClick={() => handleAction("kot")}
                className="flex items-center justify-center gap-1 rounded-md border border-(--color-border) py-2 text-xs font-medium"
              >
                <PrinterIcon size={13} strokeWidth={1.8} />
                Print KOT
              </button>
              <button
                type="button"
                onClick={() => handleAction("bill")}
                className="flex items-center justify-center gap-1 rounded-md border border-(--color-border) py-2 text-xs font-medium"
              >
                <PrinterIcon size={13} strokeWidth={1.8} />
                Print Bill
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center justify-center gap-1 rounded-md border border-(--color-border) py-2 text-xs font-medium text-red-500"
              >
                <Cancel01Icon size={13} strokeWidth={1.8} />
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleAction("payment")}
                className="col-span-2 flex items-center justify-center gap-1.5 rounded-md bg-(--color-accent) py-2.5 text-sm font-medium text-white"
              >
                <CreditCardIcon size={15} strokeWidth={1.8} />
                Complete Payment
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
