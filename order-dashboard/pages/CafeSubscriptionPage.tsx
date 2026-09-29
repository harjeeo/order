import { useEffect, useState } from "react";
import { CrownIcon, CheckmarkCircle02Icon, Calendar03Icon } from "hugeicons-react";
import { getMyProfile } from "../lib/api";

function formatCurrency(n) {
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export default function CafeSubscriptionPage() {
  const [plan, setPlan] = useState(null);
  const [planExpiry, setPlanExpiry] = useState(null);
  const [planPrice, setPlanPrice] = useState(0);

  useEffect(() => {
    getMyProfile().then((me: any) => {
      setPlan(me.plan);
      setPlanExpiry(me.planExpiry);
      setPlanPrice(me.planPrice ?? 0);
    });
  }, []);

  if (!plan) return null;

  const isPaid = plan === "Monthly" || plan === "Yearly";
  const cycle = plan === "Monthly" ? "month" : plan === "Yearly" ? "year" : null;

  return (
    <div className="px-8 py-6">
      <h1 className="flex items-center gap-2 text-2xl font-semibold">
        <CrownIcon size={20} strokeWidth={1.8} />
        Subscription
      </h1>
      <p className="mt-1 text-sm text-(--color-text-muted)">Your plan and billing details for this cafe.</p>

      <div className="mt-6 max-w-md rounded-xl border border-(--color-border) p-5">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-(--color-text-muted)">Current Plan</div>
          {isPaid ? (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckmarkCircle02Icon size={12} strokeWidth={2} />
              {plan} Subscription Activated
            </span>
          ) : (
            <span className="rounded-full bg-black/5 px-2.5 py-1 text-xs font-medium text-(--color-text-muted) dark:bg-white/10">
              Free Trial
            </span>
          )}
        </div>

        <div className="mt-4 flex items-baseline gap-1">
          <span className="text-3xl font-semibold tabular-nums">{formatCurrency(planPrice)}</span>
          {cycle && <span className="text-sm text-(--color-text-muted)">/ {cycle}</span>}
        </div>

        <div className="mt-4 flex items-center gap-1.5 text-sm text-(--color-text-muted)">
          <Calendar03Icon size={15} strokeWidth={1.8} />
          {isPaid ? `Renews on ${formatDate(planExpiry)}` : `Trial ends on ${formatDate(planExpiry)}`}
        </div>

        <p className="mt-4 text-xs text-(--color-text-muted)">
          To change or renew your plan, contact your platform administrator.
        </p>
      </div>
    </div>
  );
}
