import { CafeIcon, Restaurant01Icon, Coffee02Icon, Store01Icon, Building02Icon, IceCream01Icon } from "hugeicons-react";

const INDUSTRIES = [
  { icon: CafeIcon, label: "Cafes" },
  { icon: Restaurant01Icon, label: "Restaurants" },
  { icon: Coffee02Icon, label: "Coffee shops" },
  { icon: Store01Icon, label: "Quick service" },
  { icon: Building02Icon, label: "Cloud kitchens" },
  { icon: IceCream01Icon, label: "Dessert bars" },
];

export default function Trusted() {
  return (
    <section id="trusted" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <p className="text-center text-xs font-medium uppercase tracking-wider text-(--color-text-muted)">
        Built for every kind of counter
      </p>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {INDUSTRIES.map(({ icon: Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-2 text-(--color-text-muted)">
            <Icon size={22} strokeWidth={1.6} />
            <span className="text-xs">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
