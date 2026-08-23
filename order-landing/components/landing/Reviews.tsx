import { StarIcon, QuoteUpIcon } from "hugeicons-react";
import Avatar from "../Avatar";

const REVIEWS = [
  {
    name: "Tanvir Kalsi",
    role: "Owner, Tanvir's Cafe",
    quote:
      "We moved off spreadsheets and a paper KOT pad in one weekend. Orders hit the kitchen screen the second they're placed — no more shouting across the counter.",
  },
  {
    name: "Meera Iyer",
    role: "Manager, South Brew Co.",
    quote:
      "The recipe-linked inventory alone paid for itself. We finally know exactly how much milk we're going through without counting cans by hand.",
  },
  {
    name: "Rohan Verma",
    role: "Founder, Firegrill QSR",
    quote:
      "Rolled out to three outlets under one Pro account. Each manager only sees their own store's data — exactly what we needed before we could scale.",
  },
];

export default function Reviews() {
  return (
    <section className="border-y border-(--color-border) bg-(--color-sidebar)">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-medium uppercase tracking-wider text-(--color-accent)">Reviews</span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-(--color-text) sm:text-4xl">
            Loved by the counter, not just the owner
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {REVIEWS.map((r) => (
            <div key={r.name} className="flex flex-col rounded-xl border border-(--color-border) bg-(--color-canvas) p-6">
              <QuoteUpIcon size={20} strokeWidth={1.8} className="text-(--color-accent)/40" />
              <p className="mt-3 flex-1 text-sm leading-relaxed text-(--color-text)">{r.quote}</p>
              <div className="mt-5 flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <StarIcon key={i} size={14} strokeWidth={1.8} className="fill-amber-400 text-amber-400" />
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2.5">
                <Avatar name={r.name} size={32} />
                <div>
                  <div className="text-sm font-medium text-(--color-text)">{r.name}</div>
                  <div className="text-xs text-(--color-text-muted)">{r.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
