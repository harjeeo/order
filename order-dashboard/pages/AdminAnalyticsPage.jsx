import { Analytics01Icon } from "hugeicons-react";

export default function AdminAnalyticsPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-10 py-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-(--color-accent)/10 text-(--color-accent)">
        <Analytics01Icon size={30} strokeWidth={1.8} />
      </div>
      <h1 className="mb-2 text-2xl font-semibold">Analytics</h1>
      <p className="max-w-sm text-sm text-(--color-text-muted)">
        Deeper usage analytics (active users, retention, feature adoption) are coming soon.
      </p>
    </div>
  );
}
