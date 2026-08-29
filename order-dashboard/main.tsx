import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Navigate, createBrowserRouter, RouterProvider } from "react-router-dom";
import "./styles/index.css";

import CafeLayout from "./layouts/CafeLayout";
import CafeDashboardPage from "./pages/CafeDashboardPage";
import CafePosPage from "./pages/CafePosPage";
import CafeTablesPage from "./pages/CafeTablesPage";
import CafeReservationsPage from "./pages/CafeReservationsPage";
import CafeKitchenPage from "./pages/CafeKitchenPage";
import CafeKitchenDisplayPage from "./pages/CafeKitchenDisplayPage";
import CafeOrdersPage from "./pages/CafeOrdersPage";
import CafeMenuPage from "./pages/CafeMenuPage";
import CafeRecipesPage from "./pages/CafeRecipesPage";
import CafeBillingPage from "./pages/CafeBillingPage";
import CafeCustomersPage from "./pages/CafeCustomersPage";
import CafeInventoryPage from "./pages/CafeInventoryPage";
import CafeStaffPage from "./pages/CafeStaffPage";
import CafeAttendancePage from "./pages/CafeAttendancePage";
import CafePayrollPage from "./pages/CafePayrollPage";
import CafeExpensesPage from "./pages/CafeExpensesPage";
import CafeReportsPage from "./pages/CafeReportsPage";
import CafeSettingsPage from "./pages/CafeSettingsPage";
import SuperAdminLayout from "./layouts/SuperAdminLayout";
import SuperAdminDashboardPage from "./pages/SuperAdminDashboardPage";
import SuperAdminTenantsPage from "./pages/SuperAdminTenantsPage";
import SuperAdminReportsPage from "./pages/SuperAdminReportsPage";
import SuperAdminSettingsPage from "./pages/SuperAdminSettingsPage";
import SuperAdminActivityPage from "./pages/SuperAdminActivityPage";
import SuperAdminIconLibraryPage from "./pages/SuperAdminIconLibraryPage";
import SuperAdminLoginPage from "./pages/SuperAdminLoginPage";
import CafeLoginPage from "./pages/CafeLoginPage";
import CafeSignupPage from "./pages/CafeSignupPage";
import CafePublicOrderPage from "./pages/CafePublicOrderPage";
import CafePublicMenuPage from "./pages/CafePublicMenuPage";
import RequireAuth from "./components/RequireAuth";

const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/super-admin" replace /> },
  { path: "/login/super-admin", element: <SuperAdminLoginPage /> },
  { path: "/login/cafe", element: <CafeLoginPage /> },
  { path: "/signup", element: <CafeSignupPage /> },
  { path: "/order/:tenantId/:tableId", element: <CafePublicOrderPage /> },
  { path: "/menu/:slug", element: <CafePublicMenuPage /> },
  {
    path: "/cafe/kitchen/display",
    element: (
      <RequireAuth role="cafe">
        <CafeKitchenDisplayPage />
      </RequireAuth>
    ),
  },
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
      { path: "activity", element: <SuperAdminActivityPage /> },
      { path: "icon-library", element: <SuperAdminIconLibraryPage /> },
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
      { path: "reservations", element: <CafeReservationsPage /> },
      { path: "kitchen", element: <CafeKitchenPage /> },
      { path: "menu", element: <CafeMenuPage /> },
      { path: "recipes", element: <CafeRecipesPage /> },
      { path: "billing", element: <CafeBillingPage /> },
      { path: "customers", element: <CafeCustomersPage /> },
      { path: "inventory", element: <CafeInventoryPage /> },
      { path: "staff", element: <CafeStaffPage /> },
      { path: "attendance", element: <CafeAttendancePage /> },
      { path: "payroll", element: <CafePayrollPage /> },
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
