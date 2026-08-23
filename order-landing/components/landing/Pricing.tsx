import { CheckmarkCircle02Icon, SparklesIcon } from "hugeicons-react";

const PLANS = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    desc: "For a single counter getting started.",
    features: ["1 outlet", "POS + Orders + KOT", "Up to 2 staff logins", "Basic sales reports"],
    cta: "Start for free",
    highlighted: false,
  },
  {
    name: "Basic",
    price: "₹999",
    period: "/ month",
    desc: "For a cafe running full daily operations.",
    features: [
      "1 outlet",
      "Everything in Free",
      "Inventory + Recipes",
      "Unlimited staff logins",
      "GST-ready invoices",
    ],
    cta: "Start 14-day trial",
    highlighted: true,
  },
  {
    name: "Pro",
    price: "₹2,499",
    period: "/ month",
    desc: "For multi-outlet brands that need it all.",
    features: [
      "Unlimited outlets",
      "Everything in Basic",
      "Advanced reports & exports",
      "Role-based permissions",
      "Priority support",
    ],
    cta: "Talk to us",
    highlighted: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <span className="text-xs font-medium uppercase tracking-wider text-(--color-accent)">Pricing</span>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-(--color-text) sm:text-4xl">
          Simple pricing, per outlet
        </h2>
        <p className="mt-3 text-(--color-text-muted)">Start free. Upgrade only when your counter actually needs to.</p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`relative flex flex-col rounded-2xl border p-6 ${
              plan.highlighted
                ? "border-zinc-900 bg-zinc-900 text-white shadow-xl shadow-zinc-900/20 lg:-translate-y-3"
                : "border-(--color-border) bg-(--color-canvas)"
            }`}
          >
            {plan.highlighted && (
              <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-(--color-accent) px-3 py-1 text-[11px] font-medium text-white">
                <SparklesIcon size={12} strokeWidth={1.8} />
                Most popular
              </span>
            )}

            <h3 className={`text-sm font-semibold ${plan.highlighted ? "text-white" : "text-(--color-text)"}`}>
              {plan.name}
            </h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className={`text-3xl font-semibold ${plan.highlighted ? "text-white" : "text-(--color-text)"}`}>
                {plan.price}
              </span>
              <span className={`text-sm ${plan.highlighted ? "text-white/60" : "text-(--color-text-muted)"}`}>
                {plan.period}
              </span>
            </div>
            <p className={`mt-2 text-sm ${plan.highlighted ? "text-white/70" : "text-(--color-text-muted)"}`}>
              {plan.desc}
            </p>

            <ul className="mt-6 flex flex-1 flex-col gap-2.5">
              {plan.features.map((f) => (
                <li
                  key={f}
                  className={`flex items-start gap-2 text-sm ${plan.highlighted ? "text-white/90" : "text-(--color-text)"}`}
                >
                  <CheckmarkCircle02Icon
                    size={16}
                    strokeWidth={1.8}
                    className={`mt-0.5 shrink-0 ${plan.highlighted ? "text-emerald-400" : "text-(--color-accent)"}`}
                  />
                  {f}
                </li>
              ))}
            </ul>

            <a
              href="#get-started"
              className={`mt-6 rounded-md py-2.5 text-center text-sm font-medium transition-opacity hover:opacity-90 ${
                plan.highlighted
                  ? "bg-white text-zinc-900"
                  : "border border-(--color-border) text-(--color-text)"
              }`}
            >
              {plan.cta}
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
