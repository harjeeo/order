import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Navigate, createBrowserRouter, RouterProvider } from "react-router-dom";
import "./styles/index.css";

import AdminLayout from "./layouts/AdminLayout";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminWorkspacesPage from "./pages/AdminWorkspacesPage";
import AdminAnalyticsPage from "./pages/AdminAnalyticsPage";
import AdminSettingsPage from "./pages/AdminSettingsPage";
import CafeLayout from "./layouts/CafeLayout";
import CafeDashboardPage from "./pages/CafeDashboardPage";
import CafePosPage from "./pages/CafePosPage";
import CafeTablesPage from "./pages/CafeTablesPage";
import CafeKitchenPage from "./pages/CafeKitchenPage";
import CafeOrdersPage from "./pages/CafeOrdersPage";
import CafeMenuPage from "./pages/CafeMenuPage";
import CafeRecipesPage from "./pages/CafeRecipesPage";
import CafeBillingPage from "./pages/CafeBillingPage";
import CafeCustomersPage from "./pages/CafeCustomersPage";
import CafeInventoryPage from "./pages/CafeInventoryPage";
import CafeStaffPage from "./pages/CafeStaffPage";
import CafeExpensesPage from "./pages/CafeExpensesPage";

const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/cafe" replace /> },
  {
    path: "/admin",
    element: <AdminLayout onLogout={() => console.log("logout")} />,
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: "users", element: <AdminUsersPage /> },
      { path: "workspaces", element: <AdminWorkspacesPage /> },
      { path: "analytics", element: <AdminAnalyticsPage /> },
      { path: "settings", element: <AdminSettingsPage /> },
    ],
  },
  {
    path: "/cafe",
    element: <CafeLayout onLogout={() => console.log("logout")} />,
    children: [
      { index: true, element: <CafeDashboardPage /> },
      { path: "pos", element: <CafePosPage /> },
      { path: "orders", element: <CafeOrdersPage /> },
      { path: "tables", element: <CafeTablesPage /> },
      { path: "kitchen", element: <CafeKitchenPage /> },
      { path: "menu", element: <CafeMenuPage /> },
      { path: "recipes", element: <CafeRecipesPage /> },
      { path: "billing", element: <CafeBillingPage /> },
      { path: "customers", element: <CafeCustomersPage /> },
      { path: "inventory", element: <CafeInventoryPage /> },
      { path: "staff", element: <CafeStaffPage /> },
      { path: "expenses", element: <CafeExpensesPage /> },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
