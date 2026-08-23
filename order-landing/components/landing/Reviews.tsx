import { StarIcon } from "hugeicons-react";
import Avatar from "../Avatar";

const REVIEWS = [
  {
    name: "Tanvir Kalsi",
    role: "Owner, Cafe",
    quote: "The intuitive design makes it the easiest tool our floor staff has ever picked up.",
  },
  {
    name: "Meera Iyer",
    role: "Manager",
    quote: "Seamless integration, extensive features and intuitive workflows.",
  },
  {
    name: "Rohan Verma",
    role: "Founder",
    quote: "It cuts through the noise of running daily operations without slowing anyone down.",
  },
  {
    name: "Sarah J.",
    role: "Ops Lead",
    quote: "Facilitates collaboration and creativity across every shift, outstanding results.",
  },
  {
    name: "Mark Naruh",
    role: "Owner",
    quote: "Simplifies the complexity of running a multi-outlet cafe brand end to end.",
  },
];

export default function Reviews() {
  return (
    <section id="reviews" className="border-y border-(--color-border) bg-(--color-sidebar)">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 xl:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-medium uppercase tracking-wider text-(--color-accent)">Customer Reviews</span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-(--color-text) sm:text-4xl">
            Why businesses choose us
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {REVIEWS.map((r) => (
            <div key={r.name} className="flex flex-col rounded-xl border border-(--color-border) bg-(--color-canvas) p-4">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <StarIcon key={i} size={12} strokeWidth={1.8} className="fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="mt-3 flex-1 text-xs leading-relaxed text-(--color-text)">{r.quote}</p>
              <div className="mt-4 flex items-center gap-2">
                <Avatar name={r.name} size={26} />
                <div>
                  <div className="text-xs font-medium text-(--color-text)">{r.name}</div>
                  <div className="text-[11px] text-(--color-text-muted)">{r.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
