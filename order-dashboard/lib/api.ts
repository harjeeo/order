// Real API client — same function names/shapes as the old lib/mockApi.ts so
// pages only need their import path swapped. Talks to order-dashboard-api.

import { getToken, logout } from "./useAuth";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    logout();
    window.location.href = "/login";
    throw new Error("Session expired");
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.error ?? "Request failed");
  return data;
}

const get = (path: string) => request(path);
const post = (path: string, body?: unknown) => request(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined });
const patch = (path: string, body?: unknown) => request(path, { method: "PATCH", body: JSON.stringify(body) });
const del = (path: string) => request(path, { method: "DELETE" });

function qs(params: Record<string, string | undefined>) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) s.set(k, v);
  const str = s.toString();
  return str ? `?${str}` : "";
}

function toBackendOrderType(t: string) {
  return t === "dine-in" ? "dine_in" : t;
}
function fromBackendOrderType(t: string) {
  return t === "dine_in" ? "dine-in" : t;
}

function toDateInput(d: string | Date | null | undefined) {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

// --- Order shape mapping ---------------------------------------------------

function mapOrder(o: any) {
  return {
    _id: o.id,
    orderNumber: o.orderNumber,
    orderType: fromBackendOrderType(o.orderType),
    table: o.table?.number ?? null,
    tableId: o.tableId ?? null,
    customerId: o.customerId ?? null,
    customer: o.customerName,
    waiter: o.waiter,
    items: (o.items ?? []).map((i: any) => ({ name: i.name, qty: i.qty, unitPrice: i.unitPrice, notes: i.notes })),
    amount: o.amount,
    paymentStatus: o.paymentStatus,
    status: o.status,
    notes: o.notes,
    createdAt: o.createdAt,
    source: o.source ?? "staff",
  };
}

// --- Cafe / Restaurant POS dashboard ---------------------------------

export async function getCafeDashboardStats() {
  return get("/reports/dashboard");
}

// --- POS / New Order ---------------------------------------------------

export async function getMenuCategories() {
  const names: string[] = await get("/menu/categories");
  return ["All", ...names];
}

export async function addMenuCategory(name: string) {
  await post("/menu/categories", { name });
  return getMenuCategories();
}

export async function removeMenuCategory(name: string) {
  await del(`/menu/categories/${encodeURIComponent(name)}`);
  return getMenuCategories();
}

function mapMenuItem(item: any) {
  return {
    _id: item.id,
    name: item.name,
    category: item.category?.name ?? item.category,
    image: item.image,
    price: item.price,
    tax: item.tax,
    available: item.available,
    variants: (item.variants ?? []).map((v: any) => ({ name: v.name, price: v.price })),
    addons: (item.addons ?? []).map((a: any) => ({ name: a.name, price: a.price })),
  };
}

export async function getMenuItems({ category = "All", search = "" }: { category?: string; search?: string } = {}) {
  const items = await get(`/menu/items${qs({ category: category !== "All" ? category : undefined, search })}`);
  return items.map(mapMenuItem);
}

async function resolveCategoryId(name: string) {
  const category = await post("/menu/categories", { name });
  return category.id as string;
}

export async function createMenuItem(data: any) {
  const categoryId = await resolveCategoryId(data.category);
  const item = await post("/menu/items", {
    name: data.name,
    categoryId,
    image: data.image,
    price: data.price,
    tax: data.tax,
    available: data.available,
    variants: data.variants ?? [],
    addons: data.addons ?? [],
  });
  return mapMenuItem(item);
}

export async function updateMenuItem(itemId: string, data: any) {
  const payload: any = { ...data };
  if (data.category) {
    payload.categoryId = await resolveCategoryId(data.category);
    delete payload.category;
  }
  const item = await patch(`/menu/items/${itemId}`, payload);
  return mapMenuItem(item);
}

export async function deleteMenuItem(itemId: string) {
  return del(`/menu/items/${itemId}`);
}

export async function toggleMenuItemAvailability(itemId: string) {
  const item = await post(`/menu/items/${itemId}/toggle-availability`);
  return mapMenuItem(item);
}

function mapTable(t: any) {
  return { _id: t.id, number: t.number, capacity: t.capacity, status: t.status };
}

export async function getTables() {
  const tables = await get("/tables");
  return tables.map(mapTable);
}

export async function setTableStatus(tableId: string, status: string) {
  const table = await patch(`/tables/${tableId}/status`, { status });
  return mapTable(table);
}

export async function transferTable(fromTableId: string, toTableId: string) {
  const tables = await post(`/tables/${fromTableId}/transfer/${toTableId}`);
  return tables.map(mapTable);
}

export async function mergeTables(sourceTableIds: string[], targetTableId: string) {
  const tables = await post("/tables/merge", { sourceIds: sourceTableIds, targetId: targetTableId });
  return tables.map(mapTable);
}

export async function getCustomersList({ search = "" }: { search?: string } = {}) {
  const result = await get(`/customers${qs({ search, pageSize: "100" })}`);
  return result.items.map((c: any) => ({ _id: c.id, name: c.name, phone: c.phone }));
}

// Simulates submitting an order to the backend (KOT/bill/hold/save/payment).
export async function submitOrder(order: any) {
  const items = order.items.map((i: any) => ({
    menuItemId: i.itemId,
    name: i.addons?.length ? `${i.name} (+${i.addons.map((a: any) => a.name).join(", ")})` : i.name,
    qty: i.qty,
    unitPrice: i.unitPrice + (i.addons ?? []).reduce((s: number, a: any) => s + a.price, 0),
    notes: i.notes ?? "",
  }));
  const created = await post("/orders", {
    orderType: toBackendOrderType(order.orderType),
    tableId: order.tableId || null,
    customerId: order.customerId || null,
    waiter: order.waiter ?? "",
    notes: order.notes ?? "",
    items,
    amount: order.total,
    action: order.action,
  });
  return mapOrder(created);
}

// --- Kitchen / KOT -------------------------------------------------------

function mapKot(k: any) {
  return {
    _id: k.id,
    orderNumber: k.orderNumber,
    tableNumber: k.order?.table?.number ?? null,
    orderType: fromBackendOrderType(k.order?.orderType),
    items: (k.order?.items ?? []).map((i: any) => ({ name: i.name, qty: i.qty, notes: i.notes })),
    notes: k.order?.notes ?? "",
    status: k.status,
    priority: k.priority,
    createdAt: k.createdAt,
  };
}

export async function getKitchenOrders() {
  const tickets = await get("/kitchen");
  return tickets.map(mapKot);
}

export async function updateKitchenOrderStatus(kotId: string, status: string) {
  const ticket = await patch(`/kitchen/${kotId}/status`, { status });
  return mapKot(ticket);
}

export async function toggleKitchenOrderPriority(kotId: string) {
  const ticket = await post(`/kitchen/${kotId}/toggle-priority`);
  return mapKot(ticket);
}

// Real audit-trail entry for what got printed — best-effort like the
// email sending helpers, so a logging hiccup never blocks the actual
// print/download the user is trying to do.
async function logPrint(type: "kot" | "invoice", action: "print" | "reprint" | "download", refId: string) {
  try {
    await post("/print-log", { type, action, refId });
  } catch {
    // Non-fatal: the print/download itself still happens.
  }
}

export async function reprintKot(kotId: string) {
  return logPrint("kot", "reprint", kotId);
}

// --- Orders ---------------------------------------------------------------

export async function getOrders({
  search = "",
  status = "all",
  orderType = "all",
  page = 1,
  pageSize = 20,
}: { search?: string; status?: string; orderType?: string; page?: number; pageSize?: number } = {}) {
  const result = await get(
    `/orders${qs({
      search,
      status: status !== "all" ? status : undefined,
      orderType: orderType !== "all" ? toBackendOrderType(orderType) : undefined,
      page: String(page),
      pageSize: String(pageSize),
    })}`
  );
  return { items: result.items.map(mapOrder), total: result.total, page: result.page, pageSize: result.pageSize };
}

export async function updateOrderStatus(orderId: string, status: string) {
  const order = await patch(`/orders/${orderId}/status`, { status });
  return mapOrder(order);
}

export async function updateOrder(orderId: string, data: any) {
  const payload: any = {};
  if (data.customer !== undefined) payload.customerName = data.customer;
  if (data.waiter !== undefined) payload.waiter = data.waiter;
  if (data.amount !== undefined) payload.amount = data.amount;
  if (data.items !== undefined) payload.items = data.items.map((i: any) => ({ name: i.name, qty: i.qty, unitPrice: i.unitPrice ?? 0, notes: i.notes ?? "" }));
  const order = await patch(`/orders/${orderId}`, payload);
  return mapOrder(order);
}

export async function cancelOrder(orderId: string) {
  const order = await post(`/orders/${orderId}/cancel`);
  return mapOrder(order);
}

export async function refundOrder(orderId: string) {
  const order = await post(`/orders/${orderId}/refund`);
  return mapOrder(order);
}

export async function printInvoice(orderId: string) {
  return logPrint("invoice", "print", orderId);
}

// --- Billing & Payments -----------------------------------------------

export async function getBillableOrders() {
  const orders = await get("/billing/billable-orders");
  return orders.map(mapOrder);
}

function mapInvoice(inv: any) {
  return {
    _id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    orderNumber: inv.order?.orderNumber ?? "",
    customer: inv.customerName,
    subtotal: inv.subtotal,
    discountAmount: inv.discountAmount,
    serviceChargeAmount: inv.serviceChargeAmount,
    taxAmount: inv.taxAmount,
    roundOff: inv.roundOff,
    total: inv.total,
    method: inv.method,
    refunded: inv.refunded,
    rating: inv.rating ?? null,
    feedbackNote: inv.feedbackNote ?? "",
    createdAt: inv.createdAt,
    pointsEarned: inv.pointsEarned ?? 0,
    customerPointsBalance: inv.customerPointsBalance ?? null,
  };
}

export async function completePayment(orderId: string, payload: any) {
  const invoice = await post(`/billing/orders/${orderId}/pay`, payload);
  return mapInvoice(invoice);
}

export async function getInvoices({ page = 1, pageSize = 20 }: { page?: number; pageSize?: number } = {}) {
  const result = await get(`/billing/invoices${qs({ page: String(page), pageSize: String(pageSize) })}`);
  return { items: result.items.map(mapInvoice), total: result.total, page: result.page, pageSize: result.pageSize };
}

export async function reprintInvoice(invoiceId: string) {
  return logPrint("invoice", "reprint", invoiceId);
}

export async function downloadInvoice(invoiceId: string) {
  return logPrint("invoice", "download", invoiceId);
}

export async function refundInvoice(invoiceId: string) {
  const invoice = await post(`/billing/invoices/${invoiceId}/refund`);
  return mapInvoice(invoice);
}

export async function submitInvoiceFeedback(invoiceId: string, rating: number, note: string) {
  const invoice = await post(`/billing/invoices/${invoiceId}/feedback`, { rating, note });
  return mapInvoice(invoice);
}

// --- Customers --------------------------------------------------------

function mapCustomer(c: any) {
  return {
    _id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    address: c.address,
    totalOrders: c.totalOrders ?? 0,
    totalSpent: c.totalSpent ?? 0,
    lastOrderAt: c.lastOrderAt ?? null,
    loyaltyPoints: c.loyaltyPoints ?? 0,
  };
}

export async function getCustomer(customerId: string) {
  return mapCustomer(await get(`/customers/${customerId}`));
}

export async function getCustomers({
  search = "",
  page = 1,
  pageSize = 20,
}: { search?: string; page?: number; pageSize?: number } = {}) {
  const result = await get(`/customers${qs({ search, page: String(page), pageSize: String(pageSize) })}`);
  return { items: result.items.map(mapCustomer), total: result.total, page: result.page, pageSize: result.pageSize };
}

export async function getCustomerOrderHistory(customerId: string) {
  const orders = await get(`/customers/${customerId}/orders`);
  return orders.map(mapOrder);
}

export async function createCustomer(data: any) {
  const customer = await post("/customers", data);
  return mapCustomer(customer);
}

export async function updateCustomer(customerId: string, data: any) {
  const customer = await patch(`/customers/${customerId}`, data);
  return mapCustomer(customer);
}

export async function deleteCustomer(customerId: string) {
  return del(`/customers/${customerId}`);
}

// --- Inventory ----------------------------------------------------------

export async function getIngredients() {
  const ingredients = await get("/inventory/ingredients");
  return ingredients.map((i: any) => ({ _id: i.id, name: i.name, unit: i.unit, stock: i.stock, minimum: i.minimum, status: i.status }));
}

export async function recordStockMovement(ingredientId: string, payload: { type: string; qty: number | string; note?: string }) {
  const ingredient = await post(`/inventory/ingredients/${ingredientId}/movements`, payload);
  return { _id: ingredient.id, name: ingredient.name, unit: ingredient.unit, stock: ingredient.stock, minimum: ingredient.minimum, status: ingredient.status };
}

export async function getStockLog() {
  const log = await get("/inventory/movements");
  return log.map((m: any) => ({
    _id: m.id,
    ingredientId: m.ingredientId,
    ingredientName: m.ingredient?.name,
    type: m.type,
    qty: m.qty,
    note: m.note,
    createdAt: m.createdAt,
  }));
}

export async function createIngredient(data: any) {
  const ingredient = await post("/inventory/ingredients", data);
  return { _id: ingredient.id, ...ingredient };
}

// --- Recipes ----------------------------------------------------------

export async function getRecipe(menuItemId: string) {
  const rows = await get(`/recipes/${menuItemId}`);
  return rows.map((r: any) => ({ ingredientId: r.ingredientId, ingredientName: r.ingredientName, unit: r.unit, qty: r.qty }));
}

export async function saveRecipe(menuItemId: string, ingredients: { ingredientId: string; qty: number }[]) {
  const rows = await request(`/recipes/${menuItemId}`, { method: "PUT", body: JSON.stringify({ ingredients }) });
  return rows.map((r: any) => ({ ingredientId: r.ingredientId, ingredientName: r.ingredientName, unit: r.unit, qty: r.qty }));
}

// --- Staff & Roles --------------------------------------------------------

export const PERMISSION_MODULES = ["POS", "Orders", "Menu", "Inventory", "Reports", "Settings"];
export const ROLES = ["Admin", "Manager", "Cashier", "Waiter", "Kitchen Staff"];

const ROLE_TO_BACKEND: Record<string, string> = {
  Admin: "ADMIN",
  Manager: "MANAGER",
  Cashier: "CASHIER",
  Waiter: "WAITER",
  "Kitchen Staff": "KITCHEN_STAFF",
};
const ROLE_FROM_BACKEND: Record<string, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  CASHIER: "Cashier",
  WAITER: "Waiter",
  KITCHEN_STAFF: "Kitchen Staff",
};

const ROLE_DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
  Admin: { POS: true, Orders: true, Menu: true, Inventory: true, Reports: true, Settings: true },
  Manager: { POS: true, Orders: true, Menu: true, Inventory: true, Reports: true, Settings: false },
  Cashier: { POS: true, Orders: true, Menu: false, Inventory: false, Reports: false, Settings: false },
  Waiter: { POS: true, Orders: true, Menu: false, Inventory: false, Reports: false, Settings: false },
  "Kitchen Staff": { POS: false, Orders: true, Menu: false, Inventory: false, Reports: false, Settings: false },
};

export function defaultPermissionsForRole(role: string) {
  return { ...(ROLE_DEFAULT_PERMISSIONS[role] ?? {}) };
}

function mapStaff(s: any) {
  return {
    _id: s.id,
    name: s.name,
    email: s.email,
    role: ROLE_FROM_BACKEND[s.role] ?? s.role,
    phone: s.phone,
    active: s.active,
    permissions: s.permissions,
    monthlySalary: s.monthlySalary ?? 0,
    lastSalaryPaidAt: s.lastSalaryPaidAt ?? null,
  };
}

export async function getStaff() {
  const staff = await get("/staff");
  return staff.map(mapStaff);
}

export async function createStaff(data: any) {
  const staff = await post("/staff", {
    name: data.name,
    email: data.email,
    role: ROLE_TO_BACKEND[data.role] ?? data.role,
    phone: data.phone,
  });
  return mapStaff({ ...staff, permissions: data.permissions, active: true });
}

export async function updateStaff(staffId: string, data: any) {
  const payload: any = { ...data };
  if (data.role) payload.role = ROLE_TO_BACKEND[data.role] ?? data.role;
  const staff = await patch(`/staff/${staffId}`, payload);
  return mapStaff({ ...staff, permissions: data.permissions, active: true });
}

export async function deleteStaff(staffId: string) {
  return del(`/staff/${staffId}`);
}

export async function toggleStaffActive(staffId: string) {
  return post(`/staff/${staffId}/toggle-active`);
}

export async function setStaffSalary(staffId: string, monthlySalary: number) {
  const staff = await patch(`/staff/${staffId}`, { monthlySalary });
  return mapStaff({ ...staff, permissions: undefined, active: true });
}

export async function paySalary(staffId: string) {
  return post(`/staff/${staffId}/pay-salary`);
}

// --- Shifts / attendance -----------------------------------------------

function mapShift(s: any) {
  return {
    _id: s.id,
    userId: s.userId,
    staffName: s.user?.name ?? "",
    role: s.user?.role ? (ROLE_FROM_BACKEND[s.user.role] ?? s.user.role) : "",
    clockIn: s.clockIn,
    clockOut: s.clockOut ?? null,
  };
}

export async function getActiveShift() {
  const shift = await get("/shifts/me/active");
  return shift ? mapShift(shift) : null;
}

export async function clockIn() {
  return mapShift(await post("/shifts/clock-in"));
}

export async function clockOut() {
  return mapShift(await post("/shifts/clock-out"));
}

export async function getShifts({ page = 1, pageSize = 30 }: { page?: number; pageSize?: number } = {}) {
  const result = await get(`/shifts${qs({ page: String(page), pageSize: String(pageSize) })}`);
  return { items: result.items.map(mapShift), total: result.total, page: result.page, pageSize: result.pageSize };
}

// --- Expenses ---------------------------------------------------------

export const EXPENSE_CATEGORIES = ["Rent", "Electricity", "Salary", "Purchase", "Maintenance", "Other"];
export const PAYMENT_METHODS = ["Cash", "UPI", "Card", "Bank Transfer"];

function mapExpense(e: any) {
  return { _id: e.id, category: e.category, amount: e.amount, date: toDateInput(e.date), method: e.method, notes: e.notes };
}

export async function getExpenses({ category = "All", search = "" }: { category?: string; search?: string } = {}) {
  const expenses = await get(`/expenses${qs({ category: category !== "All" ? category : undefined, search })}`);
  return expenses.map(mapExpense);
}

export async function createExpense(data: any) {
  const expense = await post("/expenses", data);
  return mapExpense(expense);
}

export async function deleteExpense(expenseId: string) {
  return del(`/expenses/${expenseId}`);
}

// --- Reports ------------------------------------------------------------

export const REPORT_RANGES = ["daily", "weekly", "monthly", "custom"];

export async function getReportsSummary(_opts: { range?: string } = {}) {
  return get("/reports");
}

// --- Settings (Restaurant Profile, GST/Tax, Invoice, KOT, Printer, Payments) --

export async function getSettings() {
  return get("/settings");
}

export async function updateSettings(section: string, data: any) {
  const settings = await patch(`/settings/${section}`, data);
  return (settings as any)[section];
}

export async function changePassword(currentPassword: string, newPassword: string) {
  return post("/auth/change-password", { currentPassword, newPassword });
}

// --- Super Admin: Tenant management -------------------------------------

export const TENANT_PLANS = ["Free", "Basic", "Pro"];

function mapTenant(t: any) {
  return {
    _id: t.id,
    name: t.name,
    ownerName: t.ownerName,
    phone: t.phone,
    email: t.email,
    address: t.address,
    status: t.status,
    plan: t.plan,
    planExpiry: toDateInput(t.planExpiry),
    totalOrders: t.totalOrders ?? 0,
    totalRevenue: t.totalRevenue ?? 0,
    staffCount: t.staffCount ?? 0,
    createdAt: t.createdAt,
  };
}

export async function getSuperAdminStats() {
  return get("/tenants/stats/summary");
}

export async function getTenants({
  search = "",
  status = "all",
  page = 1,
  pageSize = 20,
}: { search?: string; status?: string; page?: number; pageSize?: number } = {}) {
  const result = await get(
    `/tenants${qs({ search, status: status !== "all" ? status : undefined, page: String(page), pageSize: String(pageSize) })}`
  );
  return { items: result.items.map(mapTenant), total: result.total, page: result.page, pageSize: result.pageSize };
}

export async function bulkTenantAction(ids: string[], action: "suspend" | "activate" | "delete" | "plan", plan?: string) {
  return post("/tenants/bulk", { ids, action, plan });
}

export async function impersonateTenant(tenantId: string) {
  return post(`/tenants/${tenantId}/impersonate`);
}

export async function exportTenantsCsv({ search = "", status = "all" }: { search?: string; status?: string } = {}) {
  const res = await fetch(`${BASE_URL}/api/tenants/export${qs({ search, status: status !== "all" ? status : undefined })}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error("Could not export tenants");
  return res.blob();
}

export async function createTenant(data: any) {
  const tenant = await post("/tenants", data);
  return { ...mapTenant(tenant), staffLogin: tenant.staffLogin, emailSent: tenant.emailSent };
}

export async function updateTenant(tenantId: string, data: any) {
  const tenant = await patch(`/tenants/${tenantId}`, data);
  return mapTenant(tenant);
}

export async function resetTenantPassword(tenantId: string) {
  return post(`/tenants/${tenantId}/reset-password`);
}

export async function toggleTenantStatus(tenantId: string) {
  const tenant = await post(`/tenants/${tenantId}/toggle-status`);
  return mapTenant(tenant);
}

export async function deleteTenant(tenantId: string) {
  return del(`/tenants/${tenantId}`);
}

export async function getSuperAdminReports({
  expiringDays = 30,
  months = 6,
}: { expiringDays?: number; months?: number } = {}) {
  const report = await get(`/platform-settings/reports${qs({ expiringDays: String(expiringDays), months: String(months) })}`);
  return {
    ...report,
    topTenants: report.topTenants.map(mapTenant),
    expiringPlans: report.expiringPlans.map(mapTenant),
  };
}

export async function exportSuperAdminReportCsv({
  expiringDays = 30,
  months = 6,
}: { expiringDays?: number; months?: number } = {}) {
  const res = await fetch(
    `${BASE_URL}/api/platform-settings/reports/export${qs({ expiringDays: String(expiringDays), months: String(months) })}`,
    { headers: { Authorization: `Bearer ${getToken()}` } }
  );
  if (!res.ok) throw new Error("Could not export report");
  return res.blob();
}

export async function getPlatformSettings() {
  return get("/platform-settings");
}

export async function updatePlatformSettings(data: any) {
  return patch("/platform-settings", data);
}

// --- Email provider (transactional credential emails) ---------------------

// Adding a new provider: add an entry here (with its field list) and a
// matching case in order-dashboard-api/src/lib/email.ts — no other
// frontend change needed, the Settings page renders fields from this list.
export const EMAIL_PROVIDERS = [
  { key: "none", label: "None (copy credentials manually)", fields: [] as { key: string; label: string }[] },
  {
    key: "mailjet",
    label: "Mailjet",
    fields: [
      { key: "apiKey", label: "API Key" },
      { key: "apiSecret", label: "Secret Key" },
    ],
  },
  {
    key: "brevo",
    label: "Brevo",
    fields: [{ key: "apiKey", label: "API Key" }],
  },
];

export async function sendTestEmail(to: string) {
  return post("/platform-settings/email/test", { to });
}

// --- Super Admin: Audit log -----------------------------------------

export async function getAuditLog({ page = 1, pageSize = 30 }: { page?: number; pageSize?: number } = {}) {
  const result = await get(`/tenants/audit-log${qs({ page: String(page), pageSize: String(pageSize) })}`);
  return {
    items: result.items.map((e: any) => ({
      _id: e.id,
      actorEmail: e.actorEmail,
      actorRole: e.actorRole,
      action: e.action,
      targetType: e.targetType,
      targetId: e.targetId,
      meta: e.meta,
      createdAt: e.createdAt,
    })),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
  };
}

// --- Public QR ordering (no auth) --------------------------------------
// Uses fetch() directly rather than request()/get() since those attach
// whatever staff auth token happens to be in this browser, which has
// nothing to do with the customer viewing this page.

async function publicRequest(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}/api/public${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.error ?? "Request failed");
  return data;
}

export async function getPublicMenu(tenantId: string) {
  const data = await publicRequest(`/${tenantId}/menu`);
  return { tenantName: data.tenantName, categories: data.categories, items: data.items.map(mapMenuItem) };
}

export async function getPublicTable(tenantId: string, tableId: string) {
  return publicRequest(`/${tenantId}/tables/${tableId}`);
}

export async function placePublicOrder(
  tenantId: string,
  payload: { tableId: string; customerName?: string; notes?: string; items: any[]; amount: number }
) {
  return publicRequest(`/${tenantId}/orders`, { method: "POST", body: JSON.stringify(payload) });
}
