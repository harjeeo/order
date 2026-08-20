import { Navigate, useLocation } from "react-router-dom";
import { getSession, loginPathForRole, Role } from "../lib/useAuth";

export default function RequireAuth({ role, children }: { role: Role; children: React.ReactNode }) {
  const location = useLocation();
  const session = getSession();

  if (!session || session.role !== role) {
    return <Navigate to={loginPathForRole(role)} replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
