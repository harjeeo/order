import "dotenv/config";
import express from "express";
import cors from "cors";

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

export const app = express();
app.use(cors());
app.use(express.json());

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
