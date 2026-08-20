import {
  Home01Icon,
  ShoppingCart01Icon,
  Invoice01Icon,
  RestaurantTableIcon,
  KitchenUtensilsIcon,
  MenuRestaurantIcon,
  CreditCardIcon,
  PackageIcon,
  ChefHatIcon,
  UserMultiple02Icon,
  Wallet01Icon,
  Analytics01Icon,
} from "hugeicons-react";

const APPS = [
  { icon: Home01Icon, label: "Dashboard" },
  { icon: ShoppingCart01Icon, label: "POS" },
  { icon: Invoice01Icon, label: "Orders" },
  { icon: RestaurantTableIcon, label: "Tables" },
  { icon: KitchenUtensilsIcon, label: "Kitchen / KOT" },
  { icon: MenuRestaurantIcon, label: "Menu" },
  { icon: CreditCardIcon, label: "Billing" },
  { icon: PackageIcon, label: "Inventory" },
  { icon: ChefHatIcon, label: "Recipes" },
  { icon: UserMultiple02Icon, label: "Customers" },
  { icon: Wallet01Icon, label: "Expenses" },
  { icon: Analytics01Icon, label: "Reports" },
];

export default function Apps() {
  return (
    <section id="apps" className="border-y border-(--color-border) bg-(--color-sidebar)">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-medium uppercase tracking-wider text-(--color-accent)">Apps</span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-(--color-text) sm:text-4xl">
            Twelve apps, one login
          </h2>
          <p className="mt-3 text-(--color-text-muted)">
            Every module your cafe runs on, built into the same dashboard — switch between them without ever losing
            context.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {APPS.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-xl border border-(--color-border) bg-(--color-canvas) p-4 transition-transform hover:-translate-y-0.5 hover:border-(--color-accent)/40"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--color-accent)/10 text-(--color-accent)">
                <Icon size={17} strokeWidth={1.8} />
              </span>
              <span className="text-sm font-medium text-(--color-text)">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
