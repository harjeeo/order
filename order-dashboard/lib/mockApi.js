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

const SAMPLE_CATEGORIES = ["All", "Burgers", "Pizza", "Beverages", "Sandwiches", "Desserts"];

const SAMPLE_MENU_ITEMS = [
  {
    _id: "m1",
    name: "Cheese Burger",
    category: "Burgers",
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

export async function getMenuCategories() {
  return SAMPLE_CATEGORIES;
}

export async function getMenuItems({ category = "All", search = "" } = {}) {
  return SAMPLE_MENU_ITEMS.filter(
    (item) =>
      (category === "All" || item.category === category) &&
      item.name.toLowerCase().includes(search.toLowerCase())
  );
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

export async function getCustomersList({ search = "" } = {}) {
  const SAMPLE_CUSTOMERS = [
    { _id: "c1", name: "Walk-in Customer", phone: "" },
    { _id: "c2", name: "Amit Kumar", phone: "9876543210" },
    { _id: "c3", name: "Neha Gupta", phone: "9123456780" },
  ];
  return SAMPLE_CUSTOMERS.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
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
