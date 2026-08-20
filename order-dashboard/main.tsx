import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Navigate, createBrowserRouter, RouterProvider } from "react-router-dom";
import "./styles/index.css";

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
import CafeReportsPage from "./pages/CafeReportsPage";
import CafeSettingsPage from "./pages/CafeSettingsPage";
import SuperAdminLayout from "./layouts/SuperAdminLayout";
import SuperAdminDashboardPage from "./pages/SuperAdminDashboardPage";
import SuperAdminTenantsPage from "./pages/SuperAdminTenantsPage";
import SuperAdminReportsPage from "./pages/SuperAdminReportsPage";
import SuperAdminSettingsPage from "./pages/SuperAdminSettingsPage";
import SuperAdminLoginPage from "./pages/SuperAdminLoginPage";
import CafeLoginPage from "./pages/CafeLoginPage";
import CafeSignupPage from "./pages/CafeSignupPage";
import RequireAuth from "./components/RequireAuth";

const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/super-admin" replace /> },
  { path: "/login/super-admin", element: <SuperAdminLoginPage /> },
  { path: "/login/cafe", element: <CafeLoginPage /> },
  { path: "/signup", element: <CafeSignupPage /> },
  {
    path: "/super-admin",
    element: (
      <RequireAuth role="super-admin">
        <SuperAdminLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <SuperAdminDashboardPage /> },
      { path: "tenants", element: <SuperAdminTenantsPage /> },
      { path: "reports", element: <SuperAdminReportsPage /> },
      { path: "settings", element: <SuperAdminSettingsPage /> },
    ],
  },
  {
    path: "/cafe",
    element: (
      <RequireAuth role="cafe">
        <CafeLayout />
      </RequireAuth>
    ),
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
      { path: "reports", element: <CafeReportsPage /> },
      { path: "settings", element: <CafeSettingsPage /> },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
