import { ArrowRight01Icon, PlayIcon, SparklesIcon, CheckmarkCircle02Icon } from "hugeicons-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-(--color-border) bg-(--color-sidebar) px-3 py-1 text-xs font-medium text-(--color-text-muted)">
            <SparklesIcon size={13} strokeWidth={1.8} className="text-(--color-accent)" />
            Join 500+ growing cafes and restaurants
          </span>

          <h1 className="mt-6 max-w-2xl text-4xl font-semibold tracking-tight text-(--color-text) sm:text-5xl">
            Smarter Tools for Better Cafe Outcomes
          </h1>

          <p className="mt-5 max-w-xl text-base text-(--color-text-muted) sm:text-lg">
            The smarter way to run a cafe starts with using tools that streamline every step of the process.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <a
              href="#get-started"
              className="flex items-center gap-1.5 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Get Started for Free
              <ArrowRight01Icon size={16} strokeWidth={1.8} />
            </a>
            <a
              href="#showcase"
              className="flex items-center gap-1.5 rounded-full border border-(--color-border) px-5 py-2.5 text-sm font-medium text-(--color-text) transition-colors hover:bg-black/5 dark:hover:bg-white/10"
            >
              <PlayIcon size={14} strokeWidth={1.8} />
              Book a Free Demo
            </a>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-(--color-text-muted)">
            {["No card required", "14-day Pro trial", "Cancel anytime"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckmarkCircle02Icon size={14} strokeWidth={1.8} className="text-(--color-accent)" />
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="relative mt-16 rounded-2xl border border-(--color-border) bg-(--color-sidebar) p-2 shadow-2xl shadow-black/5">
          <div className="overflow-hidden rounded-xl border border-(--color-border) bg-(--color-canvas)">
            <div className="flex items-center gap-1.5 border-b border-(--color-border) px-4 py-3 sm:px-6">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="ml-3 text-xs text-(--color-text-muted)">orderdashboard.app/cafe</span>
            </div>

            <img
              src="/dashboard-screenshot.png"
              alt="Cafe Dashboard screen showing today's sales, orders, sales trend and order type summary"
              className="w-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
