import { MoneyBag02Icon, Analytics01Icon, Invoice01Icon } from "hugeicons-react";

const HIGHLIGHTS = [
  {
    icon: Invoice01Icon,
    title: "Order & Table Tracking",
    desc: "Assign orders, manage table status and keep every ticket moving without a second glance at a paper pad.",
  },
  {
    icon: Analytics01Icon,
    title: "Real-Time Sales Insights",
    desc: "Generate detailed reports on sales, staff performance and peak hours, updated live as orders come in.",
  },
  {
    icon: MoneyBag02Icon,
    title: "Billing & Payouts",
    desc: "Bring clarity to billing with automated invoices, GST-ready exports and clean end-of-day payouts.",
  },
];

function CardMock({ i }: { i: number }) {
  return (
    <div className="flex h-28 flex-col justify-between rounded-lg border border-(--color-border) bg-(--color-canvas) p-3">
      <div className="flex items-center justify-between">
        <div className="h-6 w-6 rounded-full bg-(--color-accent)/15" />
        <span className="text-[10px] font-medium text-(--color-text-muted)">₹{(i + 1) * 4200}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="h-1.5 w-3/4 rounded-full bg-(--color-border)" />
        <div className="h-1.5 w-1/2 rounded-full bg-(--color-border)" />
      </div>
    </div>
  );
}

export default function Highlights() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 xl:px-10">
      <div className="mx-auto max-w-2xl text-center">
        <span className="text-xs font-medium uppercase tracking-wider text-(--color-accent)">Power Pack</span>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-(--color-text) sm:text-4xl">
          Work Smarter, Grow Faster
        </h2>
        <p className="mt-3 text-(--color-text-muted)">
          Cafes choose OrderDashboard because it removes the complexity of running daily operations.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {HIGHLIGHTS.map(({ icon: Icon, title, desc }, i) => (
          <div key={title} className="rounded-2xl border border-(--color-border) bg-(--color-sidebar) p-4">
            <CardMock i={i} />
            <span className="mt-4 flex h-9 w-9 items-center justify-center rounded-lg bg-(--color-accent)/10 text-(--color-accent)">
              <Icon size={17} strokeWidth={1.8} />
            </span>
            <h3 className="mt-3 text-sm font-semibold text-(--color-text)">{title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-(--color-text-muted)">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
