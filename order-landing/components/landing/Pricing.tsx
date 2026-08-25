import { useState } from "react";
import { CheckmarkCircle02Icon } from "hugeicons-react";

const PLANS = [
  {
    name: "Free",
    sub: "For cafes getting started",
    monthly: 0,
    yearlyTotal: 0,
    features: ["1 outlet", "POS + Orders + KOT", "Up to 2 staff logins", "Basic sales reports"],
    cta: "Get Started Now",
    highlighted: false,
  },
  {
    name: "Basic",
    sub: "For cafes running full daily ops",
    monthly: 499,
    yearlyTotal: 3999,
    features: [
      "1 outlet",
      "Everything in Free",
      "Inventory + Recipes",
      "Unlimited staff logins",
      "GST-ready invoices",
    ],
    cta: "Get Started Now",
    highlighted: true,
  },
  {
    name: "Pro",
    sub: "For multi-outlet brands",
    monthly: 1999,
    yearlyTotal: 14999,
    features: [
      "Unlimited outlets",
      "Everything in Basic",
      "Advanced reports & exports",
      "Role-based permissions",
      "Priority support",
    ],
    cta: "Get Started Now",
    highlighted: false,
  },
];

export default function Pricing() {
  const [yearly, setYearly] = useState(false);

  return (
    <section id="pricing" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 xl:px-10">
      <div className="mx-auto max-w-2xl text-center">
        <span className="text-xs font-medium uppercase tracking-wider text-(--color-accent)">Pricing</span>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-(--color-text) sm:text-4xl">
          Our simple pricing plan
        </h2>
        <p className="mt-3 text-(--color-text-muted)">Choose the plan that fits your workflow and scale at your pace.</p>
      </div>

      <div className="mt-8 flex justify-center">
        <div className="flex gap-1 rounded-full border border-(--color-border) bg-(--color-sidebar) p-1">
          {[
            { key: false, label: "Monthly" },
            { key: true, label: "Yearly" },
          ].map((o) => (
            <button
              key={String(o.key)}
              type="button"
              onClick={() => setYearly(o.key)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                yearly === o.key ? "bg-slate-900 text-white" : "text-(--color-text-muted)"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`flex flex-col rounded-2xl border bg-(--color-canvas) p-6 ${
              plan.highlighted ? "border-(--color-accent) shadow-lg shadow-(--color-accent)/10" : "border-(--color-border)"
            }`}
          >
            <h3 className="text-sm font-semibold text-(--color-text)">{plan.name}</h3>
            <p className="mt-1 text-xs text-(--color-text-muted)">{plan.sub}</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-semibold text-(--color-text)">
                ₹{(yearly ? plan.yearlyTotal : plan.monthly).toLocaleString("en-IN")}
              </span>
              <span className="text-sm text-(--color-text-muted)">/ {yearly ? "year" : "month"}</span>
            </div>
            {yearly && plan.monthly > 0 && (
              <p className="mt-1 text-xs text-(--color-text-muted)">
                Billed annually — {Math.round((1 - plan.yearlyTotal / (plan.monthly * 12)) * 100)}% off the monthly rate
              </p>
            )}

            <a
              href="#get-started"
              className={`mt-5 rounded-md py-2.5 text-center text-sm font-medium transition-opacity hover:opacity-90 ${
                plan.highlighted ? "bg-(--color-accent) text-white" : "border border-(--color-border) text-(--color-text)"
              }`}
            >
              {plan.cta}
            </a>

            <p className="mt-6 text-xs font-medium text-(--color-text-muted)">Added Features</p>
            <ul className="mt-3 flex flex-1 flex-col gap-2.5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-(--color-text)">
                  <CheckmarkCircle02Icon size={16} strokeWidth={1.8} className="mt-0.5 shrink-0 text-(--color-accent)" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
