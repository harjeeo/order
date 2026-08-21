import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { authRouter } from "./routes/auth";
import { tenantsRouter } from "./routes/tenants";
import { menuRouter } from "./routes/menu";
import { tablesRouter } from "./routes/tables";
import { customersRouter } from "./routes/customers";
import { ordersRouter } from "./routes/orders";
import { kitchenRouter } from "./routes/kitchen";
import { billingRouter } from "./routes/billing";
import { inventoryRouter } from "./routes/inventory";
import { recipesRouter } from "./routes/recipes";
import { expensesRouter } from "./routes/expenses";
import { staffRouter } from "./routes/staff";
import { settingsRouter } from "./routes/settings";
import { reportsRouter } from "./routes/reports";
import { platformSettingsRouter } from "./routes/platformSettings";

// CORS_ORIGIN is a comma-separated allowlist (e.g.
// "https://app.example.com,https://admin.example.com"). Left unset, every
// origin is reflected — fine for local dev, but production must set it.
const corsOrigins = process.env.CORS_ORIGIN?.split(",").map((o) => o.trim()).filter(Boolean);
if (!corsOrigins && process.env.NODE_ENV === "production") {
  console.warn("[cors] CORS_ORIGIN is not set in production — every origin is currently allowed.");
}

export const app = express();
// This API is deliberately consumed cross-origin (the frontend runs on its
// own origin/port) — helmet's default same-origin Cross-Origin-Resource-
// Policy would make browsers block fetch() responses even with CORS
// headers present, so it's relaxed here. CSP/HSTS/etc. stay at helmet's
// secure defaults since those don't apply to a JSON-only API anyway.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: corsOrigins ?? true }));
app.use(express.json());

// Coarse abuse protection across the whole API, on top of the stricter
// per-route limiter in auth.ts. Generous enough not to bother a real
// POS counter during a rush.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/tenants", tenantsRouter);
app.use("/api/menu", menuRouter);
app.use("/api/tables", tablesRouter);
app.use("/api/customers", customersRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/kitchen", kitchenRouter);
app.use("/api/billing", billingRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/recipes", recipesRouter);
app.use("/api/expenses", expensesRouter);
app.use("/api/staff", staffRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/platform-settings", platformSettingsRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});
