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
      { path: "tables", element: <CafeTablesPage /> },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
