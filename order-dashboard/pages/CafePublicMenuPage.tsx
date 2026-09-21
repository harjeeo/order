import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  RestaurantIcon,
  Add01Icon,
  MinusSignIcon,
  ShoppingCart01Icon,
  CheckmarkCircle02Icon,
  Facebook01Icon,
  InstagramIcon,
  SnapchatIcon,
  YoutubeIcon,
} from "hugeicons-react";
import { getPublicMenuBySlug, placePublicMenuOrder } from "../lib/api";

const SOCIAL_ICONS = {
  facebook: Facebook01Icon,
  instagram: InstagramIcon,
  snapchat: SnapchatIcon,
  youtube: YoutubeIcon,
};

function formatCurrency(n) {
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

function hasOptions(item) {
  return item.variants.length > 0 || item.addons.length > 0;
}

export default function CafePublicMenuPage() {
  const { slug } = useParams();
  const [tenantName, setTenantName] = useState("");
  const [logo, setLogo] = useState("");
  const [about, setAbout] = useState("");
  const [social, setSocial] = useState<Record<string, { url: string; enabled: boolean }>>({});
  const [categories, setCategories] = useState(["All"]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState<
    { id: string; itemId: string; name: string; unitPrice: number; qty: number; simple: boolean }[]
  >([]);
  const [configuring, setConfiguring] = useState<{ item: any; variant: any; addons: any[]; qty: number } | null>(
    null
  );
  const [showCart, setShowCart] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [placedOrderNumber, setPlacedOrderNumber] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    getPublicMenuBySlug(slug)
      .then((menu) => {
        setTenantName(menu.tenantName);
        setLogo(menu.logo);
        setAbout(menu.about);
        setSocial(menu.social ?? {});
        setCategories(["All", ...menu.categories]);
        setItems(menu.items.filter((i) => i.available));
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Could not load menu"));
  }, [slug]);

  const visibleItems = useMemo(
    () => (activeCategory === "All" ? items : items.filter((i) => i.category === activeCategory)),
    [items, activeCategory]
  );

  const cartTotal = cart.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const cartCount = cart.reduce((s, l) => s + l.qty, 0);

  function addSimpleToCart(item) {
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.itemId === item._id && l.simple);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...prev, { id: item._id, itemId: item._id, name: item.name, unitPrice: item.price, qty: 1, simple: true }];
    });
  }

  function removeSimpleFromCart(item) {
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.itemId === item._id && l.simple);
      if (idx < 0) return prev;
      const line = prev[idx];
      if (line.qty <= 1) return prev.filter((_, i) => i !== idx);
      const next = [...prev];
      next[idx] = { ...line, qty: line.qty - 1 };
      return next;
    });
  }

  function openConfigure(item) {
    setConfiguring({ item, variant: item.variants[0] ?? null, addons: [], qty: 1 });
  }

  function toggleConfiguredAddon(addon) {
    setConfiguring((c) => {
      const exists = c.addons.some((a) => a.name === addon.name);
      return { ...c, addons: exists ? c.addons.filter((a) => a.name !== addon.name) : [...c.addons, addon] };
    });
  }

  function confirmConfigured() {
    if (!configuring) return;
    const { item, variant, addons, qty } = configuring;
    const unitPrice = (variant ? variant.price : item.price) + addons.reduce((s, a) => s + a.price, 0);
    const name = item.name + (variant ? ` (${variant.name})` : "") + (addons.length ? ` + ${addons.map((a) => a.name).join(", ")}` : "");
    setCart((prev) => [...prev, { id: `${item._id}-${Date.now()}`, itemId: item._id, name, unitPrice, qty, simple: false }]);
    setConfiguring(null);
  }

  async function handlePlaceOrder() {
    setError("");
    if (!customerName.trim() || !customerPhone.trim()) {
      setError("Enter your name and phone number to place the order.");
      return;
    }
    setPlacing(true);
    try {
      const res = await placePublicMenuOrder(slug, {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        items: cart.map((l) => ({ menuItemId: l.itemId, name: l.name, qty: l.qty, unitPrice: l.unitPrice })),
        amount: cartTotal,
      });
      setPlacedOrderNumber(res.orderNumber);
      setCart([]);
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
          Order {placedOrderNumber} sent to the kitchen. {tenantName} will call or WhatsApp you shortly to confirm.
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
      <header className="sticky top-0 z-10 border-b border-(--color-border) bg-(--color-canvas) px-4 py-4">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/5 text-3xl dark:bg-white/10">
            {logo ? logo : <RestaurantIcon size={26} strokeWidth={1.8} />}
          </div>
          <div className="mt-2 text-base font-semibold">{tenantName}</div>
          {about && <p className="mt-0.5 max-w-xs text-xs text-(--color-text-muted)">{about}</p>}

          {Object.entries(social).some(([, v]: any) => v?.enabled && v?.url) && (
            <div className="mt-2 flex items-center gap-3">
              {Object.entries(social).map(([key, v]: any) => {
                if (!v?.enabled || !v?.url) return null;
                const Icon = SOCIAL_ICONS[key];
                if (!Icon) return null;
                return (
                  <a
                    key={key}
                    href={v.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-(--color-text-muted) transition-colors hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
                  >
                    <Icon size={16} strokeWidth={1.8} />
                  </a>
                );
              })}
            </div>
          )}
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

      <div className="grid grid-cols-2 gap-3 px-4 py-4 sm:grid-cols-3 lg:grid-cols-4">
        {visibleItems.map((item) => {
          const withOptions = hasOptions(item);
          const qty = cart.find((l) => l.itemId === item._id && l.simple)?.qty ?? 0;
          return (
            <div key={item._id} className="overflow-hidden rounded-xl border border-(--color-border)">
              {item.image?.startsWith("data:") ? (
                <img src={item.image} alt={item.name} className="w-full bg-black/5 object-contain dark:bg-white/10" />
              ) : (
                <div className="flex h-28 w-full items-center justify-center bg-black/5 text-4xl dark:bg-white/10">
                  {item.image}
                </div>
              )}
              <div className="p-2.5">
                <div className="truncate text-sm font-medium">{item.name}</div>
                <div className="mt-0.5 text-xs text-(--color-text-muted)">
                  {withOptions ? `From ${formatCurrency(item.price)}` : formatCurrency(item.price)}
                </div>

                {withOptions ? (
                  <button
                    type="button"
                    onClick={() => openConfigure(item)}
                    className="mt-2 w-full rounded-md bg-(--color-accent) py-1.5 text-xs font-medium text-white"
                  >
                    Add to Cart
                  </button>
                ) : qty === 0 ? (
                  <button
                    type="button"
                    onClick={() => addSimpleToCart(item)}
                    className="mt-2 w-full rounded-md bg-(--color-accent) py-1.5 text-xs font-medium text-white"
                  >
                    Add to Cart
                  </button>
                ) : (
                  <div className="mt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => removeSimpleFromCart(item)}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-(--color-border)"
                    >
                      <MinusSignIcon size={12} strokeWidth={2} />
                    </button>
                    <span className="text-center text-sm tabular-nums">{qty}</span>
                    <button
                      type="button"
                      onClick={() => addSimpleToCart(item)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-(--color-accent) text-white"
                    >
                      <Add01Icon size={12} strokeWidth={2} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {visibleItems.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-(--color-text-muted)">No items in this category.</p>
        )}
      </div>

      {cartCount > 0 && !showCart && !configuring && (
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

      {configuring && (
        <div className="fixed inset-0 z-30 flex items-end bg-black/40" onClick={() => setConfiguring(null)}>
          <div
            className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-(--color-canvas) p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">{configuring.item.name}</h2>

            {configuring.item.variants.length > 0 && (
              <div className="mt-4">
                <div className="text-xs font-medium text-(--color-text-muted)">Variant</div>
                <div className="mt-2 flex flex-col gap-1.5">
                  {configuring.item.variants.map((v) => (
                    <button
                      key={v.name}
                      type="button"
                      onClick={() => setConfiguring((c) => ({ ...c, variant: v }))}
                      className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
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
                        onClick={() => toggleConfiguredAddon(a)}
                        className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
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
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-(--color-border)"
                >
                  <MinusSignIcon size={14} strokeWidth={1.8} />
                </button>
                <span className="w-6 text-center tabular-nums">{configuring.qty}</span>
                <button
                  type="button"
                  onClick={() => setConfiguring((c) => ({ ...c, qty: c.qty + 1 }))}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-(--color-border)"
                >
                  <Add01Icon size={14} strokeWidth={1.8} />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={confirmConfigured}
              className="mt-5 w-full rounded-md bg-(--color-accent) py-3 text-sm font-medium text-white"
            >
              Add to Cart
            </button>
          </div>
        </div>
      )}

      {showCart && (
        <div className="fixed inset-0 z-20 flex items-end bg-black/40" onClick={() => setShowCart(false)}>
          <div
            className="max-h-[80vh] w-full overflow-y-auto rounded-t-2xl bg-(--color-canvas) p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">Your order</h2>
            <div className="mt-3 flex flex-col gap-2">
              {cart.map((l) => (
                <div key={l.id} className="flex items-center justify-between text-sm">
                  <span>
                    {l.qty} × {l.name}
                  </span>
                  <span className="tabular-nums">{formatCurrency(l.unitPrice * l.qty)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-(--color-border) pt-3 text-sm font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(cartTotal)}</span>
            </div>

            <p className="mt-4 text-xs text-(--color-text-muted)">Enter your details to place the order.</p>
            <input
              type="text"
              placeholder="Your name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="mt-2 w-full rounded-md border border-(--color-border) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
            />
            <input
              type="tel"
              placeholder="Phone number"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="mt-2 w-full rounded-md border border-(--color-border) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
            />

            {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={placing || !customerName.trim() || !customerPhone.trim()}
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
