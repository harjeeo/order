import {
  ZapIcon,
  Shield01Icon,
  ChartUpIcon,
  ChefHatIcon,
  PackageIcon,
  UserGroupIcon,
} from "hugeicons-react";

const FEATURES = [
  {
    icon: ZapIcon,
    title: "Order to kitchen in one tap",
    desc: "POS, KOT and table management stay in sync — send an order and it's on the kitchen screen instantly.",
  },
  {
    icon: Shield01Icon,
    title: "Every cafe, fully isolated",
    desc: "Multi-tenant by design. Each account gets its own menu, staff, data and billing — nothing ever crosses over.",
  },
  {
    icon: ChartUpIcon,
    title: "Reports that actually help",
    desc: "Sales, GST, staff performance and expense trends in one place, updated live as orders come in.",
  },
  {
    icon: ChefHatIcon,
    title: "Recipes that manage stock",
    desc: "Link ingredients to menu items once — stock deducts itself automatically on every order, no manual entry.",
  },
  {
    icon: PackageIcon,
    title: "Inventory that warns you first",
    desc: "Low-stock and out-of-stock alerts before they become a 9pm surprise on a Saturday rush.",
  },
  {
    icon: UserGroupIcon,
    title: "Role-based staff access",
    desc: "Admins, managers, cashiers, waiters and kitchen staff each see exactly what their role needs — no more.",
  },
];

export default function Features() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 xl:px-10">
      <div className="mx-auto max-w-2xl text-center">
        <span className="text-xs font-medium uppercase tracking-wider text-(--color-accent)">Capabilities</span>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-(--color-text) sm:text-4xl">
          We Make Work Feel Effortless
        </h2>
        <p className="mt-3 text-(--color-text-muted)">
          Automation stripped down to the fundamentals, remembers and does every to-do task for you.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="group rounded-xl border border-(--color-border) bg-(--color-canvas) p-5 transition-colors hover:border-(--color-accent)/40"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-(--color-accent)/10 text-(--color-accent)">
              <Icon size={18} strokeWidth={1.8} />
            </span>
            <h3 className="mt-4 text-sm font-semibold text-(--color-text)">{title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-(--color-text-muted)">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
