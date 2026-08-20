import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { RestaurantIcon, Store01Icon, UserIcon, Mail01Icon, LockPasswordIcon, ViewIcon, ViewOffIcon } from "hugeicons-react";
import { signup, homePathForRole } from "../lib/useAuth";

function emptyForm() {
  return { cafeName: "", ownerName: "", email: "", password: "" };
}

export default function CafeSignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm());
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(field: keyof ReturnType<typeof emptyForm>, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.cafeName.trim() || !form.ownerName.trim() || !form.email.trim() || !form.password.trim()) {
      setError("Fill in every field to create your account.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const session = await signup(form);
      navigate(homePathForRole(session.role), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen w-full items-center justify-center overflow-y-auto bg-(--color-canvas) px-4 py-8 text-(--color-text)">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-(--color-accent)/10 text-(--color-accent)">
            <RestaurantIcon size={20} strokeWidth={1.8} />
          </span>
          <h1 className="mt-3 text-xl font-semibold">Create your Cafe POS account</h1>
          <p className="mt-1 text-sm text-(--color-text-muted)">Set up your cafe or restaurant in a couple minutes</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
          <div className="relative">
            <Store01Icon
              size={16}
              strokeWidth={1.8}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-muted)"
            />
            <input
              value={form.cafeName}
              onChange={(e) => set("cafeName", e.target.value)}
              placeholder="Cafe / Restaurant name"
              className="w-full rounded-md border border-(--color-border) bg-transparent py-2 pl-9 pr-3 text-sm outline-none focus:border-(--color-accent)"
            />
          </div>

          <div className="relative">
            <UserIcon
              size={16}
              strokeWidth={1.8}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-muted)"
            />
            <input
              value={form.ownerName}
              onChange={(e) => set("ownerName", e.target.value)}
              placeholder="Your name"
              className="w-full rounded-md border border-(--color-border) bg-transparent py-2 pl-9 pr-3 text-sm outline-none focus:border-(--color-accent)"
            />
          </div>

          <div className="relative">
            <Mail01Icon
              size={16}
              strokeWidth={1.8}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-muted)"
            />
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
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
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder="Password (min. 6 characters)"
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
            {loading ? "Creating account…" : "Create free account"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-(--color-text-muted)">
          Already have an account?{" "}
          <Link to="/login/cafe" className="text-(--color-accent)">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
