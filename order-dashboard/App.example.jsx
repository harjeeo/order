// Example of wiring this into a project with react-router-dom v6/v7.
// Rename to App.jsx (or copy the routes into your existing router) once
// you've dropped src/ into your project.
import { createBrowserRouter, RouterProvider } from "react-router-dom";
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

const router = createBrowserRouter([
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
      // Inventory, Customers, Reports, Settings pages get added here as
      // each module is built.
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
