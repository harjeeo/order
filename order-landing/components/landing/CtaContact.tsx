import { RocketIcon, Mail01Icon, ArrowRight01Icon } from "hugeicons-react";

export default function CtaContact() {
  return (
    <section id="get-started" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col justify-between rounded-2xl bg-(--color-accent) p-8 text-white sm:p-10">
          <div>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
              <RocketIcon size={20} strokeWidth={1.8} />
            </span>
            <h3 className="mt-5 text-2xl font-semibold tracking-tight">Get your cafe online today</h3>
            <p className="mt-2 max-w-sm text-sm text-white/85">
              Create your account, add your menu and tables, and take your first order — usually in under 15
              minutes.
            </p>
          </div>
          <a
            id="contact"
            href="#"
            className="mt-8 flex w-fit items-center gap-1.5 rounded-md bg-white px-5 py-2.5 text-sm font-medium text-(--color-accent) transition-opacity hover:opacity-90"
          >
            Create free account
            <ArrowRight01Icon size={16} strokeWidth={1.8} />
          </a>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-(--color-border) bg-(--color-sidebar) p-8 sm:p-10">
          <div>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-(--color-accent)/10 text-(--color-accent)">
              <Mail01Icon size={20} strokeWidth={1.8} />
            </span>
            <h3 className="mt-5 text-2xl font-semibold tracking-tight text-(--color-text)">
              Running more than one outlet?
            </h3>
            <p className="mt-2 max-w-sm text-sm text-(--color-text-muted)">
              Talk to us about Pro plan rollouts, custom onboarding, or migrating from your current POS.
            </p>
          </div>
          <a
            href="mailto:hello@orderdashboard.app"
            className="mt-8 flex w-fit items-center gap-1.5 rounded-md border border-(--color-border) px-5 py-2.5 text-sm font-medium text-(--color-text) transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          >
            Contact us
            <ArrowRight01Icon size={16} strokeWidth={1.8} />
          </a>
        </div>
      </div>
    </section>
  );
}
