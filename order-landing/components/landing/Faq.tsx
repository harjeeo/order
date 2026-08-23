import { useState } from "react";
import { ArrowDown01Icon } from "hugeicons-react";

const FAQS = [
  {
    q: "Is my data safe on OrderDashboard?",
    a: "Yes — every account's menu, orders, staff and billing are fully isolated by design, with nothing ever visible across accounts.",
  },
  {
    q: "How do I get started?",
    a: "Create an account, add your menu and tables, and you're taking orders — usually in under 15 minutes, no onboarding call required.",
  },
  {
    q: "Does it work with my printer?",
    a: "Kitchen tickets work on any screen out of the box, and you can wire in a thermal printer for physical KOTs and invoices whenever you're ready.",
  },
  {
    q: "Can I track sales goals?",
    a: "Yes — Reports gives you live sales, staff performance and expense trends, plus exports for GST-ready filing.",
  },
];

export default function Faq() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 xl:px-10">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <span className="text-xs font-medium uppercase tracking-wider text-(--color-accent)">FAQ</span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-(--color-text) sm:text-4xl">
            Tools that move your cafe forward, faster
          </h2>
          <p className="mt-3 max-w-sm text-(--color-text-muted)">
            Cafes choose OrderDashboard because it simplifies the complexity of running daily operations.
          </p>
        </div>

        <div className="divide-y divide-(--color-border)">
          {FAQS.map((item, i) => (
            <div key={item.q}>
              <button
                type="button"
                onClick={() => setOpen((v) => (v === i ? -1 : i))}
                className="flex w-full items-center justify-between gap-4 py-4 text-left"
              >
                <span className="text-sm font-medium text-(--color-text)">{item.q}</span>
                <ArrowDown01Icon
                  size={16}
                  strokeWidth={1.8}
                  className={`shrink-0 text-(--color-text-muted) transition-transform ${open === i ? "rotate-180" : ""}`}
                />
              </button>
              {open === i && <p className="pb-4 text-sm leading-relaxed text-(--color-text-muted)">{item.a}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
