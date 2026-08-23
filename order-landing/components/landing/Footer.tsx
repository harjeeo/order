import { InstagramIcon, Linkedin02Icon, TwitterIcon, YoutubeIcon } from "hugeicons-react";
import Logo from "./Logo";

const COLUMNS = [
  {
    title: "Quick Links",
    links: ["Features", "About us", "Pricing", "Blog"],
  },
  {
    title: "Resources",
    links: ["Style guide", "Help center", "Changelog", "Community"],
  },
];

const SOCIALS = [InstagramIcon, TwitterIcon, Linkedin02Icon, YoutubeIcon];

export default function Footer() {
  return (
    <footer className="border-t border-(--color-border)">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 xl:px-10">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2">
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-(--color-text-muted)">
              An AI-powered POS platform designed to help cafes and restaurants streamline every step of the
              process.
            </p>
            <div className="mt-4 flex items-center gap-2">
              {SOCIALS.map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-(--color-border) text-(--color-text-muted) transition-colors hover:text-(--color-text)"
                >
                  <Icon size={14} strokeWidth={1.8} />
                </a>
              ))}
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
            © {new Date().getFullYear()} OrderDashboard. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-(--color-text-muted)">
            <a href="#" className="hover:text-(--color-text)">
              Terms & Conditions
            </a>
            <a href="#" className="hover:text-(--color-text)">
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
