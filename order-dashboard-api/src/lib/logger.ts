import pino from "pino";

// Silent during tests (Jest sets NODE_ENV=test automatically) so the
// suite's output stays readable; pretty-printed in dev; structured JSON
// in production for whatever log aggregator ends up reading it.
const level = process.env.NODE_ENV === "test" ? "silent" : process.env.LOG_LEVEL ?? "info";
const pretty = process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test";

export const logger = pino({
  level,
  transport: pretty ? { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:HH:MM:ss", ignore: "pid,hostname" } } : undefined,
});
