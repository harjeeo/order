import { useState } from "react";
import { Menu01Icon, Cancel01Icon } from "hugeicons-react";
import Logo from "./Logo";
import ThemeToggle from "../ThemeToggle";

const LEFT_LINKS = [
  { href: "#apps", label: "Apps" },
  { href: "#trusted", label: "Industries" },
];

const RIGHT_LINKS = [
  { href: "#pricing", label: "Pricing" },
  { href: "#contact", label: "Help" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header
      id="top"
      className="sticky top-0 z-40 border-b border-(--color-border) bg-(--color-canvas)/80 backdrop-blur"
    >
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-2 items-center px-4 sm:px-6 lg:grid-cols-3 xl:px-10">
        <nav className="hidden items-center gap-6 lg:flex">
          {LEFT_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-(--color-text-muted) transition-colors hover:text-(--color-text)"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex justify-center lg:justify-center">
          <Logo />
        </div>

        <div className="flex items-center justify-end gap-2">
          <nav className="hidden items-center gap-6 lg:flex">
            {RIGHT_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm text-(--color-text-muted) transition-colors hover:text-(--color-text)"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden h-5 w-px bg-(--color-border) lg:block" />

          <div className="hidden items-center gap-2 lg:flex">
            <ThemeToggle />
            <a
              href="#get-started"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-(--color-text) transition-colors hover:bg-black/5 dark:hover:bg-white/10"
            >
              Login
            </a>
            <a
              href="#get-started"
              className="rounded-md bg-(--color-accent) px-3.5 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Sign up
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
            {[...LEFT_LINKS, ...RIGHT_LINKS].map((l) => (
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
              className="flex-1 rounded-md border border-(--color-border) py-2 text-center text-sm font-medium text-(--color-text)"
            >
              Login
            </a>
            <a
              href="#get-started"
              className="flex-1 rounded-md bg-(--color-accent) py-2 text-center text-sm font-medium text-white"
            >
              Sign up
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
