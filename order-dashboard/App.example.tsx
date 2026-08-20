// Example of wiring this into a project with react-router-dom v6/v7.
// Rename to App.tsx (or copy the routes into your existing router) once
// you've dropped src/ into your project.
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import SuperAdminLayout from "./layouts/SuperAdminLayout";
import SuperAdminDashboardPage from "./pages/SuperAdminDashboardPage";
import SuperAdminTenantsPage from "./pages/SuperAdminTenantsPage";
import SuperAdminReportsPage from "./pages/SuperAdminReportsPage";
import SuperAdminSettingsPage from "./pages/SuperAdminSettingsPage";
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

const router = createBrowserRouter([
  {
    path: "/super-admin",
    element: <SuperAdminLayout onLogout={() => console.log("logout")} />,
    children: [
      { index: true, element: <SuperAdminDashboardPage /> },
      { path: "tenants", element: <SuperAdminTenantsPage /> },
      { path: "reports", element: <SuperAdminReportsPage /> },
      { path: "settings", element: <SuperAdminSettingsPage /> },
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
      { path: "reports", element: <CafeReportsPage /> },
      { path: "settings", element: <CafeSettingsPage /> },
      // All scoped modules are now built.
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
