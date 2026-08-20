import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { RestaurantIcon, ShieldUserIcon, Store01Icon, Mail01Icon, LockPasswordIcon, ViewIcon, ViewOffIcon } from "hugeicons-react";
import { login, homePathForRole, Role } from "../lib/useAuth";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [role, setRole] = useState<Role>("cafe");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Enter your email and password.");
      return;
    }
    // No backend yet — any non-empty email/password signs in as a demo
    // account for the selected role.
    login({
      name: role === "super-admin" ? "Platform Owner" : "Cafe Staff",
      email: email.trim(),
      role,
    });
    navigate(from ?? homePathForRole(role), { replace: true });
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-(--color-canvas) px-4 text-(--color-text)">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-(--color-accent)/10 text-(--color-accent)">
            <RestaurantIcon size={20} strokeWidth={1.8} />
          </span>
          <h1 className="mt-3 text-xl font-semibold">Order Dashboard</h1>
          <p className="mt-1 text-sm text-(--color-text-muted)">Sign in to continue</p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-1 rounded-lg border border-(--color-border) p-1">
          <button
            type="button"
            onClick={() => setRole("cafe")}
            className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-colors ${
              role === "cafe" ? "bg-(--color-accent) text-white" : "text-(--color-text-muted)"
            }`}
          >
            <Store01Icon size={15} strokeWidth={1.8} />
            Cafe Staff
          </button>
          <button
            type="button"
            onClick={() => setRole("super-admin")}
            className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-colors ${
              role === "super-admin" ? "bg-(--color-accent) text-white" : "text-(--color-text-muted)"
            }`}
          >
            <ShieldUserIcon size={15} strokeWidth={1.8} />
            Super Admin
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
          <div className="relative">
            <Mail01Icon
              size={16}
              strokeWidth={1.8}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-muted)"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-md border border-(--color-border) bg-transparent py-2 pl-9 pr-3 text-sm outline-none focus:border-(--color-accent)"
            />
          </div>

          <div className="relative">
            <LockPasswordIcon
              size={16}
              strokeWidth={1.8}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-muted)"
            />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-md border border-(--color-border) bg-transparent py-2 pl-9 pr-9 text-sm outline-none focus:border-(--color-accent)"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-(--color-text-muted)"
            >
              {showPassword ? <ViewOffIcon size={16} strokeWidth={1.8} /> : <ViewIcon size={16} strokeWidth={1.8} />}
            </button>
          </div>

          {error && <div className="text-xs text-red-500">{error}</div>}

          <button
            type="submit"
            className="mt-1 rounded-md bg-(--color-accent) py-2 text-sm font-medium text-white"
          >
            Sign in as {role === "super-admin" ? "Super Admin" : "Cafe Staff"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-(--color-text-muted)">
          No backend yet — any email/password signs you in for this demo.
        </p>
      </div>
    </div>
  );
}
