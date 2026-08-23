import { useState } from "react";
import { Menu01Icon, Cancel01Icon, SparklesIcon } from "hugeicons-react";
import Logo from "./Logo";
import ThemeToggle from "../ThemeToggle";

const NAV_LINKS = [
  { href: "#showcase", label: "Features" },
  { href: "#reviews", label: "About us" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header id="top" className="sticky top-0 z-40">
      <div className="flex items-center justify-center gap-1.5 bg-slate-900 py-1.5 text-center text-[11px] font-medium text-white">
        <SparklesIcon size={12} strokeWidth={1.8} className="text-(--color-accent)" />
        Join 500+ growing cafes and restaurants
      </div>

      <div className="border-b border-(--color-border) bg-(--color-canvas)/80 backdrop-blur">
        <div className="mx-auto grid h-16 max-w-7xl grid-cols-2 items-center px-4 sm:px-6 lg:grid-cols-3 xl:px-10">
          <div className="flex lg:justify-start">
            <Logo />
          </div>

          <nav className="hidden items-center justify-center gap-7 lg:flex">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm text-(--color-text-muted) transition-colors hover:text-(--color-text)"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center justify-end gap-2">
            <div className="hidden items-center gap-3 lg:flex">
              <ThemeToggle />
              <a
                href="#get-started"
                className="text-sm font-medium text-(--color-text-muted) transition-colors hover:text-(--color-text)"
              >
                Log In
              </a>
              <a
                href="#get-started"
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Contact Us
              </a>
            </div>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-md text-(--color-text-muted) hover:bg-black/5 dark:hover:bg-white/10 lg:hidden"
            >
              {open ? <Cancel01Icon size={18} strokeWidth={1.8} /> : <Menu01Icon size={18} strokeWidth={1.8} />}
            </button>
          </div>
        </div>

        {open && (
          <div className="border-t border-(--color-border) px-4 py-3 lg:hidden">
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-2 py-2 text-sm text-(--color-text-muted) hover:bg-black/5 hover:text-(--color-text) dark:hover:bg-white/10"
                >
                  {l.label}
                </a>
              ))}
            </nav>
            <div className="mt-3 flex items-center gap-2">
              <ThemeToggle />
              <a
                href="#get-started"
                className="flex-1 rounded-full border border-(--color-border) py-2 text-center text-sm font-medium text-(--color-text)"
              >
                Log In
              </a>
              <a
                href="#get-started"
                className="flex-1 rounded-full bg-slate-900 py-2 text-center text-sm font-medium text-white"
              >
                Contact Us
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
