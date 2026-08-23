import { useState } from "react";
import { ArrowDown01Icon } from "hugeicons-react";

const FAQS = [
  {
    q: "How long does it take to set up a cafe?",
    a: "Most owners are live in under 15 minutes — create an account, add your menu and tables, and you're taking orders. No hardware install or onboarding call required to get started.",
  },
  {
    q: "Can I run more than one outlet on the same account?",
    a: "Yes, on the Pro plan. Each outlet gets its own menu, tables, staff and reports, while you still see everything rolled up from one login.",
  },
  {
    q: "Do I need special hardware, like a KOT printer?",
    a: "No — kitchen tickets work on any screen out of the box. If you already have a thermal printer, you can wire it in for physical KOTs and invoices whenever you're ready.",
  },
  {
    q: "Is my cafe's data isolated from other accounts?",
    a: "Completely. The platform is multi-tenant by design — every account's menu, orders, staff and billing are fully separated, with nothing ever visible across accounts.",
  },
  {
    q: "What happens if I cancel?",
    a: "You can cancel anytime from Settings, no lock-in contracts. Your data stays exportable for 30 days after cancellation in case you need it.",
  },
];

export default function Faq() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <span className="text-xs font-medium uppercase tracking-wider text-(--color-accent)">FAQ</span>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-(--color-text) sm:text-4xl">
          Questions, answered
        </h2>
        <p className="mt-3 text-(--color-text-muted)">Everything you'd want to know before switching your counter over.</p>
      </div>

      <div className="mx-auto mt-10 max-w-2xl divide-y divide-(--color-border) rounded-2xl border border-(--color-border)">
        {FAQS.map((item, i) => (
          <div key={item.q}>
            <button
              type="button"
              onClick={() => setOpen((v) => (v === i ? -1 : i))}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="text-sm font-medium text-(--color-text)">{item.q}</span>
              <ArrowDown01Icon
                size={16}
                strokeWidth={1.8}
                className={`shrink-0 text-(--color-text-muted) transition-transform ${open === i ? "rotate-180" : ""}`}
              />
            </button>
            {open === i && (
              <p className="px-5 pb-4 text-sm leading-relaxed text-(--color-text-muted)">{item.a}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
