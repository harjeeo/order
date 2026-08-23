import { useState } from "react";
import { Mail01Icon, Call02Icon, MapPinIcon, SentIcon } from "hugeicons-react";
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
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    setEmail("");
  }

  return (
    <footer className="border-t border-(--color-border) bg-(--color-sidebar)">
      <div className="border-b border-white/10 bg-zinc-900">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-5 px-4 py-10 sm:flex-row sm:items-center sm:px-6 xl:px-10">
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-white">
              Subscribe to our newsletter to get our latest updates
            </h3>
            <p className="mt-1 text-sm text-white/60">Product news and cafe operations tips, once or twice a month.</p>
          </div>

          <form onSubmit={handleSubscribe} className="flex w-full max-w-sm shrink-0 items-center gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="w-full rounded-md border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-(--color-accent)"
            />
            <button
              type="submit"
              className="flex shrink-0 items-center gap-1.5 rounded-md bg-(--color-accent) px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              {subscribed ? "Subscribed" : "Subscribe"}
              <SentIcon size={14} strokeWidth={1.8} />
            </button>
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
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
