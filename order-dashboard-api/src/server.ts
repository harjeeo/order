import { app } from "./app";
import { logger } from "./lib/logger";
import { captureException } from "./lib/monitoring";

// Last line of defense: log (and forward to Sentry if configured) instead
// of the process dying silently or dumping a raw stack trace with no
// record of it anywhere.
process.on("unhandledRejection", (reason) => {
  captureException(reason);
});
process.on("uncaughtException", (err) => {
  captureException(err);
  process.exit(1);
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  logger.info(`order-dashboard-api listening on http://localhost:${port}`);
});
