import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import ImpersonationBanner from "../components/ImpersonationBanner";
import { logout, getImpersonation, exitImpersonation } from "../lib/useAuth";
import { getOutlets, getCurrentOutletId, setCurrentOutletId } from "../lib/api";
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
} from "hugeicons-react";

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
    <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-(--color-text-muted)">
      <Building02Icon size={14} strokeWidth={1.8} />
      <select
        value={currentId ?? ""}
        onChange={handleChange}
        className="w-full rounded-md border border-(--color-border) bg-transparent px-1.5 py-1 text-xs outline-none"
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
  { to: "/cafe", label: "Dashboard", icon: Home01Icon, end: true },
  { to: "/cafe/pos", label: "POS / New Order", icon: ShoppingCart01Icon },
  { to: "/cafe/orders", label: "Orders", icon: Invoice01Icon },
  { to: "/cafe/tables", label: "Tables", icon: RestaurantTableIcon },
  { to: "/cafe/kitchen", label: "Kitchen", icon: KitchenUtensilsIcon },
  { to: "/cafe/menu", label: "Menu", icon: MenuRestaurantIcon },
  { to: "/cafe/billing", label: "Billing", icon: CreditCardIcon },
  { to: "/cafe/inventory", label: "Inventory", icon: PackageIcon },
  { to: "/cafe/recipes", label: "Recipes", icon: ChefHatIcon },
  { to: "/cafe/customers", label: "Customers", icon: UserMultiple02Icon },
  { to: "/cafe/staff", label: "Staff & Roles", icon: StaffIcon },
  { to: "/cafe/attendance", label: "Attendance", icon: Clock01Icon },
  { to: "/cafe/payroll", label: "Payroll", icon: MoneySend01Icon },
  { to: "/cafe/expenses", label: "Expenses", icon: Wallet01Icon },
  { to: "/cafe/reports", label: "Reports", icon: Analytics01Icon },
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
      <aside className="flex h-full w-60 shrink-0 flex-col border-r border-(--color-border) bg-(--color-sidebar) px-3 py-3">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-(--color-accent)/10 text-(--color-accent)">
            <RestaurantIcon size={16} strokeWidth={1.8} />
          </span>
          <span className="text-sm font-semibold">Cafe POS</span>
        </div>

        <OutletSwitcher />

        <nav className="mt-4 flex flex-col gap-0.5">
          {navLinks.map((link) => (
            <CafeLink key={link.to} {...link} />
          ))}
          <CafeLink to="/cafe/settings" label="Settings" icon={Settings02Icon} />
        </nav>

        <div className="mt-auto flex flex-col gap-0.5">
          <ThemeToggle />
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-(--color-text-muted) hover:bg-black/5 dark:hover:bg-white/10"
          >
            <Logout01Icon size={16} strokeWidth={1.8} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden">
        <ImpersonationBanner />
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
