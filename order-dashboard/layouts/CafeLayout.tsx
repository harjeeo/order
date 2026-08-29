import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import ImpersonationBanner from "../components/ImpersonationBanner";
import { logout, getImpersonation, exitImpersonation } from "../lib/useAuth";
import { getOutlets, getCurrentOutletId, setCurrentOutletId, flushOfflineQueue } from "../lib/api";
import { queuedOrderCount } from "../lib/offlineQueue";
import { useTranslation } from "../lib/i18n";
import {
  RestaurantIcon,
  Home01Icon,
  ShoppingCart01Icon,
  Invoice01Icon,
  RestaurantTableIcon,
  KitchenUtensilsIcon,
  MenuRestaurantIcon,
  CreditCardIcon,
  PackageIcon,
  ChefHatIcon,
  UserMultiple02Icon,
  ShieldUserIcon as StaffIcon,
  Wallet01Icon,
  Analytics01Icon,
  Settings02Icon,
  Logout01Icon,
  Clock01Icon,
  MoneySend01Icon,
  Building02Icon,
  WifiError01Icon,
  CalendarAdd01Icon,
} from "hugeicons-react";

function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine);
  const [queued, setQueued] = useState(queuedOrderCount());
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    async function handleOnline() {
      setOnline(true);
      setSyncing(true);
      await flushOfflineQueue();
      setQueued(queuedOrderCount());
      setSyncing(false);
    }
    function handleOffline() {
      setOnline(false);
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Orders could already be queued from a previous offline session — try
    // syncing on mount too, not just on the next "online" transition.
    if (navigator.onLine && queuedOrderCount() > 0) handleOnline();

    const poll = setInterval(() => setQueued(queuedOrderCount()), 3000);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(poll);
    };
  }, []);

  if (online && queued === 0) return null;

  return (
    <div
      className={`flex items-center gap-2 px-4 py-1.5 text-xs font-medium text-white ${
        online ? "bg-amber-500" : "bg-red-500"
      }`}
    >
      <WifiError01Icon size={14} strokeWidth={1.8} />
      {!online && `You're offline — orders will be saved and sent once you're back online.`}
      {online && syncing && `Back online — syncing ${queued} queued order${queued === 1 ? "" : "s"}…`}
      {online && !syncing && queued > 0 && `${queued} order${queued === 1 ? "" : "s"} still waiting to sync.`}
    </div>
  );
}

function OutletSwitcher() {
  const [outlets, setOutlets] = useState([]);
  const [currentId, setCurrentId] = useState(getCurrentOutletId());

  useEffect(() => {
    getOutlets().then((list) => {
      setOutlets(list);
      if (!currentId && list.length > 0) {
        const def = list.find((o) => o.isDefault) ?? list[0];
        setCurrentOutletId(def._id);
        setCurrentId(def._id);
      }
    });
  }, []);

  function handleChange(e) {
    const outletId = e.target.value;
    setCurrentOutletId(outletId);
    window.location.href = "/cafe";
  }

  if (outlets.length <= 1) return null;

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-(--color-text-muted)">
      <Building02Icon size={18} strokeWidth={1.8} />
      <select
        value={currentId ?? ""}
        onChange={handleChange}
        className="w-full rounded-md border border-(--color-border) bg-transparent px-1.5 py-1 text-sm outline-none"
      >
        {outlets.map((o) => (
          <option key={o._id} value={o._id}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}

const navLinks = [
  { to: "/cafe", labelKey: "nav.dashboard", icon: Home01Icon, end: true },
  { to: "/cafe/pos", labelKey: "nav.pos", icon: ShoppingCart01Icon },
  { to: "/cafe/orders", labelKey: "nav.orders", icon: Invoice01Icon },
  { to: "/cafe/tables", labelKey: "nav.tables", icon: RestaurantTableIcon },
  { to: "/cafe/reservations", labelKey: "nav.reservations", icon: CalendarAdd01Icon },
  { to: "/cafe/kitchen", labelKey: "nav.kitchen", icon: KitchenUtensilsIcon },
  { to: "/cafe/menu", labelKey: "nav.menu", icon: MenuRestaurantIcon },
  { to: "/cafe/billing", labelKey: "nav.billing", icon: CreditCardIcon },
  { to: "/cafe/inventory", labelKey: "nav.inventory", icon: PackageIcon },
  { to: "/cafe/recipes", labelKey: "nav.recipes", icon: ChefHatIcon },
  { to: "/cafe/customers", labelKey: "nav.customers", icon: UserMultiple02Icon },
  { to: "/cafe/staff", labelKey: "nav.staff", icon: StaffIcon },
  { to: "/cafe/attendance", labelKey: "nav.attendance", icon: Clock01Icon },
  { to: "/cafe/payroll", labelKey: "nav.payroll", icon: MoneySend01Icon },
  { to: "/cafe/expenses", labelKey: "nav.expenses", icon: Wallet01Icon },
  { to: "/cafe/reports", labelKey: "nav.reports", icon: Analytics01Icon },
];

function CafeLink({ to, label, icon: Icon, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
          isActive
            ? "bg-black/5 font-medium text-(--color-text) dark:bg-white/10"
            : "text-(--color-text-muted) hover:bg-black/5 dark:hover:bg-white/10"
        }`
      }
    >
      <Icon size={18} strokeWidth={1.8} />
      <span>{label}</span>
    </NavLink>
  );
}

export default function CafeLayout() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  function handleLogout() {
    // While impersonating, "Logout" exits back to the Super Admin's own
    // session instead of destroying it.
    if (getImpersonation()) {
      exitImpersonation();
      navigate("/super-admin/tenants", { replace: true });
      return;
    }
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-(--color-canvas) text-(--color-text)">
      <aside className="flex h-full w-60 shrink-0 flex-col border-r border-(--color-border) bg-(--color-sidebar) py-3">
        <div className="flex items-center gap-2 px-5 py-1.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-(--color-accent)/10 text-(--color-accent)">
            <RestaurantIcon size={16} strokeWidth={1.8} />
          </span>
          <span className="text-sm font-semibold">Cafe POS</span>
        </div>

        <div className="px-3">
          <OutletSwitcher />
        </div>

        <nav className="mt-4 flex flex-1 flex-col gap-0.5 overflow-y-auto px-3">
          {navLinks.map((link) => (
            <CafeLink key={link.to} to={link.to} icon={link.icon} end={link.end} label={t(link.labelKey)} />
          ))}
          <CafeLink to="/cafe/settings" label={t("nav.settings")} icon={Settings02Icon} />
        </nav>

        <div className="flex flex-col gap-0.5 border-t border-(--color-border) px-3 pt-2">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-(--color-text-muted) hover:bg-black/5 dark:hover:bg-white/10"
          >
            <Logout01Icon size={16} strokeWidth={1.8} />
            <span>{t("nav.logout")}</span>
          </button>
        </div>
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden">
        <OfflineBanner />
        <ImpersonationBanner />
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
