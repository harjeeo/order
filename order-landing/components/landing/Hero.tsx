import { ArrowRight01Icon, PlayIcon, SparklesIcon, CheckmarkCircle02Icon } from "hugeicons-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-(--color-accent)/10 blur-3xl" />
        <div className="absolute top-40 left-10 h-56 w-56 rounded-full bg-(--color-accent)/5 blur-2xl" />
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-(--color-border) bg-(--color-sidebar) px-3 py-1 text-xs font-medium text-(--color-text-muted)">
            <SparklesIcon size={13} strokeWidth={1.8} className="text-(--color-accent)" />
            One dashboard for every counter, table and kitchen ticket
          </span>

          <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-(--color-text) sm:text-5xl lg:text-6xl">
            Run your cafe like it's <span className="text-(--color-accent)">wired for it.</span>
          </h1>

          <p className="mt-5 max-w-xl text-base text-(--color-text-muted) sm:text-lg">
            POS, KOT, billing, inventory and staff — one clean workspace for every cafe or restaurant on your account,
            each with its own menu, tables and team.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <a
              href="#get-started"
              className="flex items-center gap-1.5 rounded-md bg-(--color-accent) px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Get started free
              <ArrowRight01Icon size={16} strokeWidth={1.8} />
            </a>
            <a
              href="#apps"
              className="flex items-center gap-1.5 rounded-md border border-(--color-border) px-5 py-2.5 text-sm font-medium text-(--color-text) transition-colors hover:bg-black/5 dark:hover:bg-white/10"
            >
              <PlayIcon size={14} strokeWidth={1.8} />
              See it in action
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
          <div className="rounded-xl border border-(--color-border) bg-(--color-canvas) p-4 sm:p-6">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="ml-3 text-xs text-(--color-text-muted)">orderdashboard.app/cafe</span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Today's Sales", value: "₹48,290", trend: "+12.4%" },
                { label: "Open Orders", value: "14", trend: "3 in kitchen" },
                { label: "Tables Occupied", value: "9 / 16", trend: "56%" },
                { label: "Low Stock", value: "3 items", trend: "review" },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-(--color-border) p-3 text-left">
                  <div className="text-[11px] text-(--color-text-muted)">{s.label}</div>
                  <div className="mt-1 text-lg font-semibold text-(--color-text)">{s.value}</div>
                  <div className="mt-0.5 text-[11px] text-(--color-accent)">{s.trend}</div>
                </div>
              ))}
            </div>

            <div className="mt-3 hidden gap-3 sm:grid sm:grid-cols-3">
              {["Cheese Burger ×2", "Cold Coffee ×1", "Paneer Tikka ×1"].map((item, i) => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-lg border border-(--color-border) px-3 py-2 text-xs text-(--color-text-muted)"
                >
                  <span className="text-(--color-text)">{item}</span>
                  <span className="rounded-full bg-(--color-accent)/10 px-2 py-0.5 text-(--color-accent)">
                    {i === 0 ? "Preparing" : i === 1 ? "Ready" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
