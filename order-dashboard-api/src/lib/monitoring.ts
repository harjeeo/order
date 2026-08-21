import * as Sentry from "@sentry/node";
import { logger } from "./logger";

// Inactive until SENTRY_DSN is set (Super Admin-style "configure now,
// activate later" — same pattern as the email provider settings). Call
// initMonitoring() once at process start, before anything else runs.
export function initMonitoring() {
  if (!process.env.SENTRY_DSN) return;
  Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });
  logger.info("Sentry crash monitoring enabled");
}

export function captureException(err: unknown) {
  logger.error({ err }, "Unhandled error");
  if (process.env.SENTRY_DSN) Sentry.captureException(err);
}
