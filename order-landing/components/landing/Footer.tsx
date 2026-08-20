import { Mail01Icon, Call02Icon, MapPinIcon } from "hugeicons-react";
import Logo from "./Logo";

const COLUMNS = [
  {
    title: "Product",
    links: ["Apps", "Pricing", "Industries", "Changelog"],
  },
  {
    title: "Company",
    links: ["About", "Careers", "Blog", "Contact"],
  },
  {
    title: "Resources",
    links: ["Help center", "Onboarding guide", "API status", "Community"],
  },
  {
    title: "Legal",
    links: ["Privacy policy", "Terms of service", "Refund policy"],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-(--color-border) bg-(--color-sidebar)">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2 sm:col-span-3 lg:col-span-2">
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-(--color-text-muted)">
              The all-in-one POS, kitchen and billing platform for cafes and restaurants — built for every counter,
              one dashboard at a time.
            </p>
            <div className="mt-4 flex flex-col gap-2 text-sm text-(--color-text-muted)">
              <a href="mailto:hello@orderdashboard.app" className="flex items-center gap-2 hover:text-(--color-text)">
                <Mail01Icon size={14} strokeWidth={1.8} />
                hello@orderdashboard.app
              </a>
              <span className="flex items-center gap-2">
                <Call02Icon size={14} strokeWidth={1.8} />
                +91 98765 43210
              </span>
              <span className="flex items-center gap-2">
                <MapPinIcon size={14} strokeWidth={1.8} />
                Gurugram, India
              </span>
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-(--color-text)">{col.title}</h4>
              <ul className="mt-3 flex flex-col gap-2">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-(--color-text-muted) hover:text-(--color-text)">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-(--color-border) pt-6 sm:flex-row">
          <p className="text-xs text-(--color-text-muted)">
            © {new Date().getFullYear()} Order Dashboard. All rights reserved.
          </p>
          <p className="text-xs text-(--color-text-muted)">Made for cafes that run on tight tickets.</p>
        </div>
      </div>
    </footer>
  );
}
