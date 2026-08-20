import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { RestaurantIcon, Mail01Icon, LockPasswordIcon, ViewIcon, ViewOffIcon } from "hugeicons-react";
import { login, homePathForRole } from "../lib/useAuth";

export default function CafeLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Enter your email and password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const session = await login(email.trim(), password);
      if (session.role !== "cafe") {
        setError("This account isn't a Cafe Staff account. Use the Super Admin login instead.");
        return;
      }
      navigate(from ?? homePathForRole(session.role), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-(--color-canvas) px-4 text-(--color-text)">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-(--color-accent)/10 text-(--color-accent)">
            <RestaurantIcon size={20} strokeWidth={1.8} />
          </span>
          <h1 className="mt-3 text-xl font-semibold">Cafe POS</h1>
          <p className="mt-1 text-sm text-(--color-text-muted)">Sign in to your cafe/restaurant dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
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
            disabled={loading}
            className="mt-1 rounded-md bg-(--color-accent) py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-(--color-text-muted)">
          Demo login: staff@tanvirscafe.example / password123
        </p>
        <p className="mt-2 text-center text-xs text-(--color-text-muted)">
          New cafe?{" "}
          <Link to="/signup" className="text-(--color-accent)">
            Create an account
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-(--color-text-muted)">
          Platform owner?{" "}
          <Link to="/login/super-admin" className="text-(--color-accent)">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}
