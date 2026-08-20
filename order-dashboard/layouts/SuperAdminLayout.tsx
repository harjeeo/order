import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { ShieldUserIcon, Home01Icon, Building06Icon, Analytics01Icon, Settings02Icon, Logout01Icon } from "hugeicons-react";
import ThemeToggle from "../components/ThemeToggle";
import { logout } from "../lib/useAuth";

const navLinks = [
  { to: "/super-admin", label: "Dashboard", icon: Home01Icon, end: true },
  { to: "/super-admin/tenants", label: "Cafes / Restaurants", icon: Building06Icon },
  { to: "/super-admin/reports", label: "Platform Reports", icon: Analytics01Icon },
];

function SuperAdminLink({ to, label, icon: Icon, end = false }) {
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

export default function SuperAdminLayout() {
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-(--color-canvas) text-(--color-text)">
      <aside className="flex h-full w-60 shrink-0 flex-col border-r border-(--color-border) bg-(--color-sidebar) px-3 py-3">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-(--color-accent)/10 text-(--color-accent)">
            <ShieldUserIcon size={16} strokeWidth={1.8} />
          </span>
          <span className="text-sm font-semibold">Super Admin</span>
        </div>

        <nav className="mt-4 flex flex-col gap-0.5">
          {navLinks.map((link) => (
            <SuperAdminLink key={link.to} {...link} />
          ))}
          <SuperAdminLink to="/super-admin/settings" label="Settings" icon={Settings02Icon} />
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

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
