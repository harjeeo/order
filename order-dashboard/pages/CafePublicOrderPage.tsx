import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  RestaurantIcon,
  Add01Icon,
  MinusSignIcon,
  ShoppingCart01Icon,
  CheckmarkCircle02Icon,
} from "hugeicons-react";
import { getPublicMenu, getPublicTable, placePublicOrder } from "../lib/api";

function formatCurrency(n) {
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

export default function CafePublicOrderPage() {
  const { tenantId, tableId } = useParams();
  const [tenantName, setTenantName] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [categories, setCategories] = useState(["All"]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState<Record<string, { item: any; qty: number }>>({});
  const [showCart, setShowCart] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [placedOrderNumber, setPlacedOrderNumber] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    Promise.all([getPublicMenu(tenantId, tableId), getPublicTable(tenantId, tableId)])
      .then(([menu, table]) => {
        setTenantName(menu.tenantName);
        setCategories(["All", ...menu.categories]);
        setItems(menu.items.filter((i) => i.available));
        setTableNumber(table.number);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Could not load menu"));
  }, [tenantId, tableId]);

  const visibleItems = useMemo(
    () => (activeCategory === "All" ? items : items.filter((i) => i.category === activeCategory)),
    [items, activeCategory]
  );

  const cartLines = Object.values(cart);
  const cartTotal = cartLines.reduce((s, l) => s + l.item.price * l.qty, 0);
  const cartCount = cartLines.reduce((s, l) => s + l.qty, 0);

  function addToCart(item) {
    setCart((c) => {
      const existing = c[item._id];
      return { ...c, [item._id]: { item, qty: (existing?.qty ?? 0) + 1 } };
    });
  }

  function removeFromCart(item) {
    setCart((c) => {
      const existing = c[item._id];
      if (!existing) return c;
      if (existing.qty <= 1) {
        const next = { ...c };
        delete next[item._id];
        return next;
      }
      return { ...c, [item._id]: { ...existing, qty: existing.qty - 1 } };
    });
  }

  async function handlePlaceOrder() {
    setPlacing(true);
    setError("");
    try {
      const res = await placePublicOrder(tenantId, {
        tableId,
        customerName: customerName.trim() || "Walk-in Customer",
        items: cartLines.map((l) => ({ menuItemId: l.item._id, name: l.item.name, qty: l.qty, unitPrice: l.item.price })),
        amount: cartTotal,
      });
      setPlacedOrderNumber(res.orderNumber);
      setCart({});
      setShowCart(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place order");
    } finally {
      setPlacing(false);
    }
  }

  if (loadError) {
    return (
      <div className="flex h-screen items-center justify-center bg-(--color-canvas) px-6 text-center text-(--color-text)">
        <p className="text-sm text-(--color-text-muted)">{loadError}</p>
      </div>
    );
  }

  if (placedOrderNumber) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-(--color-canvas) px-6 text-center text-(--color-text)">
        <CheckmarkCircle02Icon size={40} strokeWidth={1.5} className="text-emerald-500" />
        <h1 className="text-xl font-semibold">Order placed!</h1>
        <p className="text-sm text-(--color-text-muted)">
          Order {placedOrderNumber} sent to the kitchen for Table {tableNumber}.
        </p>
        <button
          type="button"
          onClick={() => setPlacedOrderNumber("")}
          className="mt-4 rounded-md bg-(--color-accent) px-4 py-2 text-sm font-medium text-white"
        >
          Order more
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-(--color-canvas) pb-24 text-(--color-text)">
      <header className="sticky top-0 z-10 border-b border-(--color-border) bg-(--color-canvas) px-4 py-3">
        <div className="flex items-center gap-2">
          <RestaurantIcon size={20} strokeWidth={1.8} />
          <div>
            <div className="text-sm font-semibold">{tenantName}</div>
            <div className="text-xs text-(--color-text-muted)">Table {tableNumber}</div>
          </div>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setActiveCategory(c)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs ${
                activeCategory === c
                  ? "border-(--color-accent) bg-(--color-accent) text-white"
                  : "border-(--color-border) text-(--color-text-muted)"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2">
        {visibleItems.map((item) => {
          const qty = cart[item._id]?.qty ?? 0;
          return (
            <div key={item._id} className="flex items-center gap-3 rounded-xl border border-(--color-border) p-3">
              <span className="text-2xl">{item.image?.startsWith("data:") ? "" : item.image}</span>
              <div className="flex-1">
                <div className="text-sm font-medium">{item.name}</div>
                <div className="text-xs text-(--color-text-muted)">{formatCurrency(item.price)}</div>
              </div>
              {qty === 0 ? (
                <button
                  type="button"
                  onClick={() => addToCart(item)}
                  className="rounded-md bg-(--color-accent) px-3 py-1.5 text-xs font-medium text-white"
                >
                  Add
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => removeFromCart(item)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-(--color-border)"
                  >
                    <MinusSignIcon size={12} strokeWidth={2} />
                  </button>
                  <span className="w-4 text-center text-sm tabular-nums">{qty}</span>
                  <button
                    type="button"
                    onClick={() => addToCart(item)}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-(--color-accent) text-white"
                  >
                    <Add01Icon size={12} strokeWidth={2} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {visibleItems.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-(--color-text-muted)">No items in this category.</p>
        )}
      </div>

      {cartCount > 0 && !showCart && (
        <button
          type="button"
          onClick={() => setShowCart(true)}
          className="fixed inset-x-4 bottom-4 flex items-center justify-between rounded-xl bg-(--color-accent) px-4 py-3 text-sm font-medium text-white shadow-lg"
        >
          <span className="flex items-center gap-2">
            <ShoppingCart01Icon size={18} strokeWidth={1.8} />
            {cartCount} item{cartCount > 1 ? "s" : ""}
          </span>
          <span>{formatCurrency(cartTotal)}</span>
        </button>
      )}

      {showCart && (
        <div className="fixed inset-0 z-20 flex items-end bg-black/40" onClick={() => setShowCart(false)}>
          <div
            className="max-h-[80vh] w-full overflow-y-auto rounded-t-2xl bg-(--color-canvas) p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">Your order</h2>
            <div className="mt-3 flex flex-col gap-2">
              {cartLines.map((l) => (
                <div key={l.item._id} className="flex items-center justify-between text-sm">
                  <span>
                    {l.qty} × {l.item.name}
                  </span>
                  <span className="tabular-nums">{formatCurrency(l.item.price * l.qty)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-(--color-border) pt-3 text-sm font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(cartTotal)}</span>
            </div>

            <input
              type="text"
              placeholder="Your name (optional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="mt-4 w-full rounded-md border border-(--color-border) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
            />

            {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={placing}
              className="mt-4 w-full rounded-md bg-(--color-accent) py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              {placing ? "Placing order…" : `Place order · ${formatCurrency(cartTotal)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
