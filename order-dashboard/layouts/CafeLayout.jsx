import { NavLink, Outlet } from "react-router-dom";
import {
  RestaurantIcon,
  Home01Icon,
  ShoppingCart01Icon,
  Invoice01Icon,
  RestaurantTableIcon,
  KitchenUtensilsIcon,
  MenuRestaurantIcon,
  PackageIcon,
  UserMultiple02Icon,
  Analytics01Icon,
  Settings02Icon,
  Logout01Icon,
} from "hugeicons-react";

const navLinks = [
  { to: "/cafe", label: "Dashboard", icon: Home01Icon, end: true },
  { to: "/cafe/pos", label: "POS / New Order", icon: ShoppingCart01Icon },
  { to: "/cafe/orders", label: "Orders", icon: Invoice01Icon },
  { to: "/cafe/tables", label: "Tables", icon: RestaurantTableIcon },
  { to: "/cafe/kitchen", label: "Kitchen", icon: KitchenUtensilsIcon },
  { to: "/cafe/menu", label: "Menu", icon: MenuRestaurantIcon },
  { to: "/cafe/inventory", label: "Inventory", icon: PackageIcon },
  { to: "/cafe/customers", label: "Customers", icon: UserMultiple02Icon },
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

// Pass your own logout handler (clear session, redirect, etc.) — this
// component has no auth/session code of its own.
export default function CafeLayout({ onLogout }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-(--color-canvas) text-(--color-text)">
      <aside className="flex h-full w-60 shrink-0 flex-col border-r border-(--color-border) bg-(--color-sidebar) px-3 py-3">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-(--color-accent)/10 text-(--color-accent)">
            <RestaurantIcon size={16} strokeWidth={1.8} />
          </span>
          <span className="text-sm font-semibold">Cafe POS</span>
        </div>

        <nav className="mt-4 flex flex-col gap-0.5">
          {navLinks.map((link) => (
            <CafeLink key={link.to} {...link} />
          ))}
          <CafeLink to="/cafe/settings" label="Settings" icon={Settings02Icon} />
        </nav>

        <button
          type="button"
          onClick={onLogout}
          className="mt-auto flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-(--color-text-muted) hover:bg-black/5 dark:hover:bg-white/10"
        >
          <Logout01Icon size={16} strokeWidth={1.8} />
          <span>Logout</span>
        </button>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
