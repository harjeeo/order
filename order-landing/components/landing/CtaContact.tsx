import { ArrowRight01Icon, PlayIcon, RocketIcon } from "hugeicons-react";

export default function CtaContact() {
  return (
    <section id="get-started" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 xl:px-10">
      <div className="flex flex-col items-center rounded-3xl border border-(--color-border) bg-(--color-sidebar) px-6 py-16 text-center sm:px-10">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-(--color-accent)/10 text-(--color-accent)">
          <RocketIcon size={20} strokeWidth={1.8} />
        </span>
        <span className="mt-4 text-xs font-medium uppercase tracking-wider text-(--color-accent)">Free Trial</span>
        <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight text-(--color-text) sm:text-4xl">
          Get up and running in just a few minutes
        </h2>
        <p className="mt-3 max-w-md text-(--color-text-muted)">
          Create your account, add your menu and tables, and take your first order today.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <a
            href="#"
            className="flex items-center gap-1.5 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Get Started for Free
            <ArrowRight01Icon size={16} strokeWidth={1.8} />
          </a>
          <a
            id="contact"
            href="mailto:hello@orderdashboard.app"
            className="flex items-center gap-1.5 rounded-full border border-(--color-border) px-5 py-2.5 text-sm font-medium text-(--color-text) transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          >
            <PlayIcon size={14} strokeWidth={1.8} />
            Book a Free Demo
          </a>
        </div>
      </div>
    </section>
  );
}
