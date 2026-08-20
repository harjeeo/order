// Sample data so the dashboard renders standalone, with no backend.
// Swap these functions for real fetch calls to your own API — every
// admin page only calls the four functions below.

const SAMPLE_USERS = [
  { _id: "1", name: "Tanvir Singh", email: "tanvir@example.com", avatarUrl: "", isEmailVerified: true, isSuperAdmin: true, createdAt: "2026-07-02T10:00:00Z" },
  { _id: "2", name: "Priya Sharma", email: "priya@example.com", avatarUrl: "", isEmailVerified: true, isSuperAdmin: false, createdAt: "2026-07-10T10:00:00Z" },
  { _id: "3", name: "Rahul Verma", email: "rahul@example.com", avatarUrl: "", isEmailVerified: false, isSuperAdmin: false, createdAt: "2026-07-18T10:00:00Z" },
];

const SAMPLE_WORKSPACES = [
  { _id: "w1", name: "Acme Inc", icon: "🏢", owner: { name: "Tanvir Singh", email: "tanvir@example.com" }, memberCount: 6, createdAt: "2026-07-02T10:00:00Z" },
  { _id: "w2", name: "Studio Nine", icon: "🎨", owner: { name: "Priya Sharma", email: "priya@example.com" }, memberCount: 3, createdAt: "2026-07-15T10:00:00Z" },
];

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export async function getAdminStats() {
  return {
    userCount: SAMPLE_USERS.length,
    workspaceCount: SAMPLE_WORKSPACES.length,
    projectCount: 12,
    taskCount: 84,
    noteCount: 27,
    recentSignups: [
      { date: daysAgo(4), count: 1 },
      { date: daysAgo(3), count: 2 },
      { date: daysAgo(2), count: 0 },
      { date: daysAgo(1), count: 3 },
      { date: daysAgo(0), count: 1 },
    ],
  };
}

export async function listAdminUsers({ search = "" } = {}) {
  const users = SAMPLE_USERS.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );
  return { users, total: users.length, page: 1, limit: 25 };
}

export async function listAdminWorkspaces({ search = "" } = {}) {
  const workspaces = SAMPLE_WORKSPACES.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase())
  );
  return { workspaces, total: workspaces.length, page: 1, limit: 25 };
}

// --- Cafe / Restaurant POS dashboard ---------------------------------

const SAMPLE_BEST_SELLERS = [
  { name: "Cheese Burger", qty: 42, revenue: 7518 },
  { name: "Cappuccino", qty: 38, revenue: 4180 },
  { name: "Margherita Pizza", qty: 27, revenue: 8100 },
  { name: "Cold Coffee", qty: 25, revenue: 3000 },
  { name: "Veg Sandwich", qty: 19, revenue: 2470 },
];

const SAMPLE_LOW_STOCK = [
  { ingredient: "Cheese", stock: "5 kg", minimum: "2 kg" },
  { ingredient: "Chicken", stock: "3 kg", minimum: "5 kg" },
  { ingredient: "Coffee Beans", stock: "1 kg", minimum: "1 kg" },
];

function hoursAgoLabel(n) {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d.toISOString().slice(11, 16);
}

export async function getCafeDashboardStats() {
  return {
    todaySales: 18420,
    todayOrders: 96,
    pendingOrders: 7,
    completedOrders: 84,
    totalRevenue: 18420,
    orderTypeSummary: {
      dineIn: 52,
      takeaway: 30,
      delivery: 14,
    },
    bestSellingItems: SAMPLE_BEST_SELLERS,
    lowStockItems: SAMPLE_LOW_STOCK.filter((i) => parseFloat(i.stock) <= parseFloat(i.minimum)),
    salesByHour: [6, 5, 4, 3, 2, 1, 0].map((n) => ({
      time: hoursAgoLabel(n),
      amount: Math.round(800 + Math.random() * 2200),
    })),
  };
}

// --- POS / New Order ---------------------------------------------------

const MENU_CATEGORIES = ["All", "Burgers", "Pizza", "Beverages", "Sandwiches", "Desserts"];

const SAMPLE_MENU_ITEMS = [
  {
    _id: "m1",
    name: "Cheese Burger",
    category: "Burgers",
    image: "🍔",
    price: 179,
    tax: 5,
    available: true,
    variants: [
      { name: "Regular", price: 149 },
      { name: "Cheese", price: 179 },
      { name: "Double", price: 219 },
    ],
    addons: [
      { name: "Extra Cheese", price: 30 },
      { name: "Extra Patty", price: 60 },
    ],
  },
  {
    _id: "m2",
    name: "Veg Burger",
    category: "Burgers",
    image: "🍔",
    price: 129,
    tax: 5,
    available: true,
    variants: [],
    addons: [{ name: "Extra Cheese", price: 30 }],
  },
  {
    _id: "m3",
    name: "Margherita Pizza",
    category: "Pizza",
    image: "🍕",
    price: 299,
    tax: 5,
    available: true,
    variants: [
      { name: "Regular (8\")", price: 299 },
      { name: "Medium (10\")", price: 449 },
      { name: "Large (12\")", price: 599 },
    ],
    addons: [{ name: "Extra Cheese", price: 50 }],
  },
  {
    _id: "m4",
    name: "Pepperoni Pizza",
    category: "Pizza",
    image: "🍕",
    price: 349,
    tax: 5,
    available: false,
    variants: [],
    addons: [],
  },
  {
    _id: "m5",
    name: "Cappuccino",
    category: "Beverages",
    image: "☕",
    price: 110,
    tax: 5,
    available: true,
    variants: [
      { name: "Small", price: 90 },
      { name: "Regular", price: 110 },
      { name: "Large", price: 130 },
    ],
    addons: [],
  },
  {
    _id: "m6",
    name: "Cold Coffee",
    category: "Beverages",
    image: "🥤",
    price: 120,
    tax: 5,
    available: true,
    variants: [],
    addons: [{ name: "Extra Shot", price: 25 }],
  },
  {
    _id: "m7",
    name: "Veg Sandwich",
    category: "Sandwiches",
    image: "🥪",
    price: 99,
    tax: 5,
    available: true,
    variants: [],
    addons: [{ name: "Extra Cheese", price: 20 }],
  },
  {
    _id: "m8",
    name: "Chocolate Brownie",
    category: "Desserts",
    image: "🍫",
    price: 89,
    tax: 5,
    available: true,
    variants: [],
    addons: [],
  },
];

const SAMPLE_TABLES = [
  { _id: "t1", number: "T1", capacity: 2, status: "available" },
  { _id: "t2", number: "T2", capacity: 4, status: "occupied" },
  { _id: "t3", number: "T3", capacity: 4, status: "available" },
  { _id: "t4", number: "T4", capacity: 6, status: "reserved" },
  { _id: "t5", number: "T5", capacity: 2, status: "available" },
  { _id: "t6", number: "T6", capacity: 4, status: "occupied" },
  { _id: "t7", number: "T7", capacity: 2, status: "billing" },
  { _id: "t8", number: "T8", capacity: 8, status: "available" },
];

let menuItemCounter = SAMPLE_MENU_ITEMS.length;

export async function getMenuCategories() {
  return [...MENU_CATEGORIES];
}

export async function addMenuCategory(name) {
  if (!MENU_CATEGORIES.includes(name)) MENU_CATEGORIES.push(name);
  return [...MENU_CATEGORIES];
}

export async function removeMenuCategory(name) {
  const idx = MENU_CATEGORIES.indexOf(name);
  if (idx > -1 && name !== "All") MENU_CATEGORIES.splice(idx, 1);
  return [...MENU_CATEGORIES];
}

export async function getMenuItems({ category = "All", search = "" } = {}) {
  return SAMPLE_MENU_ITEMS.filter(
    (item) =>
      (category === "All" || item.category === category) &&
      item.name.toLowerCase().includes(search.toLowerCase())
  );
}

export async function createMenuItem(data) {
  const item = {
    _id: `m${++menuItemCounter}`,
    variants: [],
    addons: [],
    available: true,
    image: "🍽️",
    ...data,
  };
  SAMPLE_MENU_ITEMS.push(item);
  return item;
}

export async function updateMenuItem(itemId, data) {
  const item = SAMPLE_MENU_ITEMS.find((i) => i._id === itemId);
  if (item) Object.assign(item, data);
  return { ...item };
}

export async function deleteMenuItem(itemId) {
  const idx = SAMPLE_MENU_ITEMS.findIndex((i) => i._id === itemId);
  if (idx > -1) SAMPLE_MENU_ITEMS.splice(idx, 1);
  return { ok: true };
}

export async function toggleMenuItemAvailability(itemId) {
  const item = SAMPLE_MENU_ITEMS.find((i) => i._id === itemId);
  if (item) item.available = !item.available;
  return { ...item };
}

export async function getTables() {
  return SAMPLE_TABLES;
}

export async function setTableStatus(tableId, status) {
  const table = SAMPLE_TABLES.find((t) => t._id === tableId);
  if (table) table.status = status;
  return { ...table };
}

export async function transferTable(fromTableId, toTableId) {
  const from = SAMPLE_TABLES.find((t) => t._id === fromTableId);
  const to = SAMPLE_TABLES.find((t) => t._id === toTableId);
  if (from && to) {
    to.status = from.status;
    from.status = "available";
  }
  return SAMPLE_TABLES;
}

export async function mergeTables(sourceTableIds, targetTableId) {
  const target = SAMPLE_TABLES.find((t) => t._id === targetTableId);
  if (target) target.status = "occupied";
  sourceTableIds
    .filter((id) => id !== targetTableId)
    .forEach((id) => {
      const source = SAMPLE_TABLES.find((t) => t._id === id);
      if (source) source.status = "available";
    });
  return SAMPLE_TABLES;
}

const SAMPLE_CUSTOMERS = [
  { _id: "c1", name: "Walk-in Customer", phone: "", email: "", address: "" },
  { _id: "c2", name: "Amit Kumar", phone: "9876543210", email: "amit.kumar@example.com", address: "12 MG Road, Pune" },
  { _id: "c3", name: "Neha Gupta", phone: "9123456780", email: "neha.gupta@example.com", address: "45 Park Street, Kolkata" },
];

export async function getCustomersList({ search = "" } = {}) {
  return SAMPLE_CUSTOMERS.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
}

export async function getCustomers({ search = "" } = {}) {
  return SAMPLE_CUSTOMERS.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  ).map((c) => {
    const orders = SAMPLE_ORDERS.filter((o) => o.customer === c.name);
    const totalSpent = orders.reduce((s, o) => s + o.amount, 0);
    const lastOrder = orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    return {
      ...c,
      totalOrders: orders.length,
      totalSpent,
      lastOrderAt: lastOrder?.createdAt ?? null,
    };
  });
}

export async function getCustomerOrderHistory(customerId) {
  const customer = SAMPLE_CUSTOMERS.find((c) => c._id === customerId);
  if (!customer) return [];
  return SAMPLE_ORDERS.filter((o) => o.customer === customer.name).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
}

let customerCounter = SAMPLE_CUSTOMERS.length;

export async function createCustomer(data) {
  const customer = { _id: `c${++customerCounter}`, phone: "", email: "", address: "", ...data };
  SAMPLE_CUSTOMERS.push(customer);
  return customer;
}

export async function updateCustomer(customerId, data) {
  const customer = SAMPLE_CUSTOMERS.find((c) => c._id === customerId);
  if (customer) Object.assign(customer, data);
  return { ...customer };
}

export async function deleteCustomer(customerId) {
  const idx = SAMPLE_CUSTOMERS.findIndex((c) => c._id === customerId);
  if (idx > -1) SAMPLE_CUSTOMERS.splice(idx, 1);
  return { ok: true };
}

// Simulates submitting an order to the backend (KOT/bill/hold/save/payment).
// Swap this for a real API call — it just resolves with an order id.
export async function submitOrder(order) {
  await new Promise((r) => setTimeout(r, 300));
  const saved = { _id: `o${Date.now()}`, ...order, createdAt: new Date().toISOString() };
  if (order.action === "kitchen" || order.action === "kot") {
    pushKotOrder(saved);
  }
  return saved;
}

// --- Kitchen / KOT -------------------------------------------------------

let kotCounter = 1003;

function pushKotOrder(order) {
  const table = SAMPLE_TABLES.find((t) => t._id === order.tableId);
  KOT_QUEUE.unshift({
    _id: `kot${Date.now()}`,
    orderNumber: `KOT-${kotCounter++}`,
    tableNumber: table ? table.number : null,
    orderType: order.orderType,
    items: order.items.map((i) => ({ name: i.name, qty: i.qty, notes: i.notes })),
    notes: order.notes,
    status: "new",
    priority: false,
    createdAt: new Date().toISOString(),
  });
}

const KOT_QUEUE = [
  {
    _id: "kot1",
    orderNumber: "KOT-1001",
    tableNumber: "T2",
    orderType: "dine-in",
    items: [
      { name: "Cheese Burger (Cheese)", qty: 2, notes: "" },
      { name: "Cold Coffee", qty: 1, notes: "less sugar" },
    ],
    notes: "",
    status: "preparing",
    priority: true,
    createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
  },
  {
    _id: "kot2",
    orderNumber: "KOT-1002",
    tableNumber: null,
    orderType: "takeaway",
    items: [{ name: "Margherita Pizza (Medium)", qty: 1, notes: "" }],
    notes: "",
    status: "new",
    priority: false,
    createdAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
  },
];

export async function getKitchenOrders() {
  return [...KOT_QUEUE];
}

export async function updateKitchenOrderStatus(kotId, status) {
  const order = KOT_QUEUE.find((o) => o._id === kotId);
  if (order) order.status = status;
  return { ...order };
}

export async function toggleKitchenOrderPriority(kotId) {
  const order = KOT_QUEUE.find((o) => o._id === kotId);
  if (order) order.priority = !order.priority;
  return { ...order };
}

export async function reprintKot(kotId) {
  await new Promise((r) => setTimeout(r, 200));
  return { ok: true, kotId };
}

// --- Orders ---------------------------------------------------------------

function minsAgo(n) {
  return new Date(Date.now() - n * 60 * 1000).toISOString();
}

const SAMPLE_ORDERS = [
  {
    _id: "ord1",
    orderNumber: "ORD-3001",
    orderType: "dine-in",
    table: "T2",
    customer: "Walk-in Customer",
    waiter: "Rahul",
    items: [
      { name: "Cheese Burger (Cheese)", qty: 2 },
      { name: "Cold Coffee", qty: 1 },
    ],
    amount: 478,
    paymentStatus: "unpaid",
    status: "preparing",
    createdAt: minsAgo(8),
  },
  {
    _id: "ord2",
    orderNumber: "ORD-3002",
    orderType: "takeaway",
    table: null,
    customer: "Amit Kumar",
    waiter: "Priya",
    items: [{ name: "Margherita Pizza (Medium)", qty: 1 }],
    amount: 449,
    paymentStatus: "paid",
    status: "pending",
    createdAt: minsAgo(3),
  },
  {
    _id: "ord3",
    orderNumber: "ORD-3000",
    orderType: "dine-in",
    table: "T5",
    customer: "Neha Gupta",
    waiter: "Rahul",
    items: [
      { name: "Veg Sandwich", qty: 2 },
      { name: "Cappuccino", qty: 2 },
    ],
    amount: 418,
    paymentStatus: "paid",
    status: "completed",
    createdAt: minsAgo(42),
  },
  {
    _id: "ord4",
    orderNumber: "ORD-2999",
    orderType: "delivery",
    table: null,
    customer: "Amit Kumar",
    waiter: "-",
    items: [{ name: "Chocolate Brownie", qty: 3 }],
    amount: 267,
    paymentStatus: "paid",
    status: "cancelled",
    createdAt: minsAgo(90),
  },
  {
    _id: "ord5",
    orderNumber: "ORD-3003",
    orderType: "dine-in",
    table: "T6",
    customer: "Walk-in Customer",
    waiter: "Priya",
    items: [{ name: "Veg Burger", qty: 1 }],
    amount: 129,
    paymentStatus: "unpaid",
    status: "ready",
    createdAt: minsAgo(1),
  },
];

export async function getOrders({ search = "", status = "all", orderType = "all" } = {}) {
  return SAMPLE_ORDERS.filter(
    (o) =>
      (status === "all" || o.status === status) &&
      (orderType === "all" || o.orderType === orderType) &&
      (o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        o.customer.toLowerCase().includes(search.toLowerCase()))
  ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function updateOrderStatus(orderId, status) {
  const order = SAMPLE_ORDERS.find((o) => o._id === orderId);
  if (order) order.status = status;
  return { ...order };
}

export async function cancelOrder(orderId) {
  const order = SAMPLE_ORDERS.find((o) => o._id === orderId);
  if (order) order.status = "cancelled";
  return { ...order };
}

export async function refundOrder(orderId) {
  const order = SAMPLE_ORDERS.find((o) => o._id === orderId);
  if (order) order.paymentStatus = "refunded";
  return { ...order };
}

export async function printInvoice(orderId) {
  await new Promise((r) => setTimeout(r, 200));
  return { ok: true, orderId };
}

// --- Billing & Payments -----------------------------------------------

let invoiceCounter = 5000;

const SAMPLE_INVOICES = [
  {
    _id: "inv1",
    invoiceNumber: "INV-4999",
    orderNumber: "ORD-3000",
    customer: "Neha Gupta",
    subtotal: 418,
    discountAmount: 0,
    serviceChargeAmount: 21,
    taxAmount: 22,
    roundOff: 1,
    total: 462,
    method: "upi",
    createdAt: minsAgo(40),
  },
];

export async function getBillableOrders() {
  return SAMPLE_ORDERS.filter((o) => o.paymentStatus === "unpaid" && o.status !== "cancelled");
}

export async function completePayment(orderId, payload) {
  const order = SAMPLE_ORDERS.find((o) => o._id === orderId);
  if (!order) throw new Error("Order not found");
  order.paymentStatus = "paid";
  order.status = order.status === "pending" ? "completed" : order.status;

  const invoice = {
    _id: `inv${Date.now()}`,
    invoiceNumber: `INV-${++invoiceCounter}`,
    orderNumber: order.orderNumber,
    customer: order.customer,
    ...payload,
    createdAt: new Date().toISOString(),
  };
  SAMPLE_INVOICES.unshift(invoice);
  return invoice;
}

export async function getInvoices() {
  return [...SAMPLE_INVOICES];
}

export async function reprintInvoice(invoiceId) {
  await new Promise((r) => setTimeout(r, 200));
  return { ok: true, invoiceId };
}

export async function downloadInvoice(invoiceId) {
  await new Promise((r) => setTimeout(r, 200));
  return { ok: true, invoiceId };
}

export async function refundInvoice(invoiceId) {
  const invoice = SAMPLE_INVOICES.find((i) => i._id === invoiceId);
  if (invoice) invoice.refunded = true;
  const order = SAMPLE_ORDERS.find((o) => o.orderNumber === invoice?.orderNumber);
  if (order) order.paymentStatus = "refunded";
  return { ...invoice };
}

// --- Inventory ----------------------------------------------------------

const SAMPLE_INGREDIENTS = [
  { _id: "i1", name: "Cheese", unit: "kg", stock: 5, minimum: 2 },
  { _id: "i2", name: "Chicken", unit: "kg", stock: 3, minimum: 5 },
  { _id: "i3", name: "Coffee Beans", unit: "kg", stock: 1, minimum: 1 },
  { _id: "i4", name: "Burger Buns", unit: "pcs", stock: 40, minimum: 20 },
  { _id: "i5", name: "Tomato", unit: "kg", stock: 0, minimum: 3 },
  { _id: "i6", name: "Milk", unit: "ltr", stock: 12, minimum: 5 },
];

let stockLogCounter = 0;
const SAMPLE_STOCK_LOG = [];

function ingredientStatus(ing) {
  if (ing.stock <= 0) return "out";
  if (ing.stock <= ing.minimum) return "low";
  return "ok";
}

export async function getIngredients() {
  return SAMPLE_INGREDIENTS.map((i) => ({ ...i, status: ingredientStatus(i) }));
}

export async function recordStockMovement(ingredientId, { type, qty, note = "" }) {
  const ingredient = SAMPLE_INGREDIENTS.find((i) => i._id === ingredientId);
  if (!ingredient) throw new Error("Ingredient not found");
  const amount = Number(qty) || 0;
  if (type === "in") ingredient.stock += amount;
  else if (type === "out" || type === "wastage") ingredient.stock = Math.max(0, ingredient.stock - amount);
  else if (type === "adjustment") ingredient.stock = amount;

  SAMPLE_STOCK_LOG.unshift({
    _id: `sl${++stockLogCounter}`,
    ingredientId,
    ingredientName: ingredient.name,
    type,
    qty: amount,
    note,
    createdAt: new Date().toISOString(),
  });
  return { ...ingredient, status: ingredientStatus(ingredient) };
}

export async function getStockLog() {
  return [...SAMPLE_STOCK_LOG];
}

export async function createIngredient(data) {
  const ingredient = { _id: `i${Date.now()}`, stock: 0, minimum: 0, unit: "kg", ...data };
  SAMPLE_INGREDIENTS.push(ingredient);
  return ingredient;
}

// --- Staff & Roles --------------------------------------------------------

export const PERMISSION_MODULES = ["POS", "Orders", "Menu", "Inventory", "Reports", "Settings"];

export const ROLES = ["Admin", "Manager", "Cashier", "Waiter", "Kitchen Staff"];

const ROLE_DEFAULT_PERMISSIONS = {
  Admin: { POS: true, Orders: true, Menu: true, Inventory: true, Reports: true, Settings: true },
  Manager: { POS: true, Orders: true, Menu: true, Inventory: true, Reports: true, Settings: false },
  Cashier: { POS: true, Orders: true, Menu: false, Inventory: false, Reports: false, Settings: false },
  Waiter: { POS: true, Orders: true, Menu: false, Inventory: false, Reports: false, Settings: false },
  "Kitchen Staff": { POS: false, Orders: true, Menu: false, Inventory: false, Reports: false, Settings: false },
};

const SAMPLE_STAFF = [
  { _id: "s1", name: "Tanvir Singh", role: "Admin", phone: "9876500001", email: "tanvir@cafe.example", active: true, permissions: { ...ROLE_DEFAULT_PERMISSIONS.Admin } },
  { _id: "s2", name: "Priya Sharma", role: "Manager", phone: "9876500002", email: "priya@cafe.example", active: true, permissions: { ...ROLE_DEFAULT_PERMISSIONS.Manager } },
  { _id: "s3", name: "Rahul Verma", role: "Waiter", phone: "9876500003", email: "rahul@cafe.example", active: true, permissions: { ...ROLE_DEFAULT_PERMISSIONS.Waiter } },
  { _id: "s4", name: "Suresh Kumar", role: "Kitchen Staff", phone: "9876500004", email: "suresh@cafe.example", active: true, permissions: { ...ROLE_DEFAULT_PERMISSIONS["Kitchen Staff"] } },
  { _id: "s5", name: "Anjali Rao", role: "Cashier", phone: "9876500005", email: "anjali@cafe.example", active: false, permissions: { ...ROLE_DEFAULT_PERMISSIONS.Cashier } },
];

export async function getStaff() {
  return [...SAMPLE_STAFF];
}

export function defaultPermissionsForRole(role) {
  return { ...(ROLE_DEFAULT_PERMISSIONS[role] ?? {}) };
}

let staffCounter = SAMPLE_STAFF.length;

export async function createStaff(data) {
  const member = {
    _id: `s${++staffCounter}`,
    active: true,
    permissions: defaultPermissionsForRole(data.role),
    ...data,
  };
  SAMPLE_STAFF.push(member);
  return member;
}

export async function updateStaff(staffId, data) {
  const member = SAMPLE_STAFF.find((s) => s._id === staffId);
  if (member) Object.assign(member, data);
  return { ...member };
}

export async function deleteStaff(staffId) {
  const idx = SAMPLE_STAFF.findIndex((s) => s._id === staffId);
  if (idx > -1) SAMPLE_STAFF.splice(idx, 1);
  return { ok: true };
}

export async function toggleStaffActive(staffId) {
  const member = SAMPLE_STAFF.find((s) => s._id === staffId);
  if (member) member.active = !member.active;
  return { ...member };
}

// --- Expenses ---------------------------------------------------------

export const EXPENSE_CATEGORIES = ["Rent", "Electricity", "Salary", "Purchase", "Maintenance", "Other"];
export const PAYMENT_METHODS = ["Cash", "UPI", "Card", "Bank Transfer"];

function daysAgoDate(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const SAMPLE_EXPENSES = [
  { _id: "e1", category: "Rent", amount: 45000, date: daysAgoDate(15), method: "Bank Transfer", notes: "Monthly shop rent" },
  { _id: "e2", category: "Salary", amount: 68000, date: daysAgoDate(10), method: "Bank Transfer", notes: "Staff salaries" },
  { _id: "e3", category: "Purchase", amount: 12400, date: daysAgoDate(3), method: "UPI", notes: "Vegetables & dairy restock" },
  { _id: "e4", category: "Electricity", amount: 5200, date: daysAgoDate(6), method: "Card", notes: "" },
  { _id: "e5", category: "Maintenance", amount: 1800, date: daysAgoDate(1), method: "Cash", notes: "Coffee machine service" },
];

let expenseCounter = SAMPLE_EXPENSES.length;

export async function getExpenses({ category = "All", search = "" } = {}) {
  return SAMPLE_EXPENSES.filter(
    (e) =>
      (category === "All" || e.category === category) &&
      (e.notes.toLowerCase().includes(search.toLowerCase()) || e.category.toLowerCase().includes(search.toLowerCase()))
  ).sort((a, b) => new Date(b.date) - new Date(a.date));
}

export async function createExpense(data) {
  const expense = { _id: `e${++expenseCounter}`, notes: "", ...data };
  SAMPLE_EXPENSES.unshift(expense);
  return expense;
}

export async function deleteExpense(expenseId) {
  const idx = SAMPLE_EXPENSES.findIndex((e) => e._id === expenseId);
  if (idx > -1) SAMPLE_EXPENSES.splice(idx, 1);
  return { ok: true };
}

// --- Reports ------------------------------------------------------------

export const REPORT_RANGES = ["daily", "weekly", "monthly", "custom"];

export async function getReportsSummary({ range = "daily" } = {}) {
  const nonCancelled = SAMPLE_ORDERS.filter((o) => o.status !== "cancelled");
  const completed = SAMPLE_ORDERS.filter((o) => o.status === "completed");
  const cancelled = SAMPLE_ORDERS.filter((o) => o.status === "cancelled");
  const totalSales = nonCancelled.reduce((s, o) => s + o.amount, 0);
  const avgOrderValue = nonCancelled.length ? Math.round(totalSales / nonCancelled.length) : 0;

  const categorySales = {};
  for (const item of SAMPLE_BEST_SELLERS) {
    const menuItem = SAMPLE_MENU_ITEMS.find((m) => item.name.includes(m.name));
    const category = menuItem?.category ?? "Other";
    categorySales[category] = (categorySales[category] ?? 0) + item.revenue;
  }

  const paymentTotals = { cash: 0, upi: 0, card: 0, split: 0 };
  for (const inv of SAMPLE_INVOICES) {
    if (paymentTotals[inv.method] !== undefined) paymentTotals[inv.method] += inv.total;
  }

  const ingredients = SAMPLE_INGREDIENTS.map((i) => ({ ...i, status: ingredientStatus(i) }));
  const wastageTotal = SAMPLE_STOCK_LOG.filter((l) => l.type === "wastage").reduce((s, l) => s + l.qty, 0);

  const totalExpenses = SAMPLE_EXPENSES.reduce((s, e) => s + e.amount, 0);

  return {
    range,
    sales: {
      total: totalSales,
      trend: [6, 5, 4, 3, 2, 1, 0].map((n) => ({
        label: range === "monthly" ? `Wk ${7 - n}` : range === "weekly" ? daysAgoDate(n).slice(5) : hoursAgoLabel(n),
        amount: Math.round(totalSales / 7 + (Math.random() - 0.5) * (totalSales / 10)),
      })),
    },
    orders: {
      total: SAMPLE_ORDERS.length,
      completed: completed.length,
      cancelled: cancelled.length,
      avgOrderValue,
    },
    products: {
      bestSellers: SAMPLE_BEST_SELLERS,
      categorySales,
    },
    payments: paymentTotals,
    inventory: {
      totalIngredients: ingredients.length,
      lowStock: ingredients.filter((i) => i.status === "low").length,
      outOfStock: ingredients.filter((i) => i.status === "out").length,
      wastageTotal,
    },
    expenses: { total: totalExpenses, byCategory: EXPENSE_CATEGORIES.map((c) => ({
      category: c,
      amount: SAMPLE_EXPENSES.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0),
    })) },
  };
}

// --- Settings (Restaurant Profile, GST/Tax, Invoice, KOT, Printer, Payments) --

const SAMPLE_SETTINGS = {
  restaurant: {
    name: "Tanvir's Cafe",
    logo: "🍽️",
    phone: "9876500000",
    email: "hello@tanvirscafe.example",
    address: "12 MG Road, Pune, Maharashtra 411001",
  },
  tax: {
    gstin: "27ABCDE1234F1Z5",
    applyGst: true,
    cgstPercent: 2.5,
    sgstPercent: 2.5,
    igstPercent: 5,
  },
  invoice: {
    prefix: "INV-",
    footerNote: "Thank you for visiting! GST is included as applicable.",
    showLogo: true,
  },
  kot: {
    autoPrint: true,
    showPrices: false,
  },
  printer: {
    kotPrinterName: "Kitchen Printer (58mm)",
    billPrinterName: "Counter Printer (80mm)",
    paperWidth: "80mm",
  },
  paymentMethods: { cash: true, upi: true, card: true, split: true },
};

export async function getSettings() {
  return JSON.parse(JSON.stringify(SAMPLE_SETTINGS));
}

export async function updateSettings(section, data) {
  SAMPLE_SETTINGS[section] = { ...SAMPLE_SETTINGS[section], ...data };
  return JSON.parse(JSON.stringify(SAMPLE_SETTINGS[section]));
}

// --- Super Admin: Tenant (cafe/restaurant client) management -----------

export const TENANT_PLANS = ["Free", "Basic", "Pro"];

function daysAgoIso(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function daysFromNowDate(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const SAMPLE_TENANTS = [
  {
    _id: "t1",
    name: "Tanvir's Cafe",
    ownerName: "Tanvir Singh",
    phone: "9876500000",
    email: "hello@tanvirscafe.example",
    address: "12 MG Road, Pune",
    status: "active",
    plan: "Pro",
    planExpiry: daysFromNowDate(45),
    totalOrders: 1284,
    totalRevenue: 312450,
    staffCount: 8,
    createdAt: daysAgoIso(120),
  },
  {
    _id: "t2",
    name: "Punjabi Dhaba",
    ownerName: "Harjeet Kaur",
    phone: "9876500011",
    email: "owner@punjabidhaba.example",
    address: "Sector 17, Chandigarh",
    status: "active",
    plan: "Basic",
    planExpiry: daysFromNowDate(12),
    totalOrders: 640,
    totalRevenue: 148200,
    staffCount: 5,
    createdAt: daysAgoIso(70),
  },
  {
    _id: "t3",
    name: "Cafe Mocha",
    ownerName: "Neha Gupta",
    phone: "9876500022",
    email: "neha@cafemocha.example",
    address: "Park Street, Kolkata",
    status: "suspended",
    plan: "Free",
    planExpiry: daysFromNowDate(-5),
    totalOrders: 92,
    totalRevenue: 18600,
    staffCount: 2,
    createdAt: daysAgoIso(20),
  },
];

let tenantCounter = SAMPLE_TENANTS.length;

export async function getSuperAdminStats() {
  const active = SAMPLE_TENANTS.filter((t) => t.status === "active");
  const suspended = SAMPLE_TENANTS.filter((t) => t.status === "suspended");
  return {
    totalTenants: SAMPLE_TENANTS.length,
    activeTenants: active.length,
    suspendedTenants: suspended.length,
    platformRevenue: SAMPLE_TENANTS.reduce((s, t) => s + t.totalRevenue, 0),
    recentSignups: [4, 3, 2, 1, 0].map((n) => ({
      date: daysAgoIso(n).slice(0, 10),
      count: SAMPLE_TENANTS.filter((t) => t.createdAt.slice(0, 10) === daysAgoIso(n).slice(0, 10)).length,
    })),
  };
}

export async function getTenants({ search = "", status = "all" } = {}) {
  return SAMPLE_TENANTS.filter(
    (t) =>
      (status === "all" || t.status === status) &&
      (t.name.toLowerCase().includes(search.toLowerCase()) || t.ownerName.toLowerCase().includes(search.toLowerCase()))
  ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function createTenant(data) {
  const tenant = {
    _id: `t${++tenantCounter}`,
    status: "active",
    plan: "Free",
    planExpiry: daysFromNowDate(14),
    totalOrders: 0,
    totalRevenue: 0,
    staffCount: 0,
    createdAt: new Date().toISOString(),
    ...data,
  };
  SAMPLE_TENANTS.unshift(tenant);
  return tenant;
}

export async function updateTenant(tenantId, data) {
  const tenant = SAMPLE_TENANTS.find((t) => t._id === tenantId);
  if (tenant) Object.assign(tenant, data);
  return { ...tenant };
}

export async function toggleTenantStatus(tenantId) {
  const tenant = SAMPLE_TENANTS.find((t) => t._id === tenantId);
  if (tenant) tenant.status = tenant.status === "active" ? "suspended" : "active";
  return { ...tenant };
}

export async function deleteTenant(tenantId) {
  const idx = SAMPLE_TENANTS.findIndex((t) => t._id === tenantId);
  if (idx > -1) SAMPLE_TENANTS.splice(idx, 1);
  return { ok: true };
}
