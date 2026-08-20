import { useNavigate } from "react-router-dom";
import { EyeIcon, Logout03Icon } from "hugeicons-react";
import { getImpersonation, exitImpersonation } from "../lib/useAuth";

export default function ImpersonationBanner() {
  const navigate = useNavigate();
  const impersonation = getImpersonation();
  if (!impersonation) return null;

  function handleExit() {
    exitImpersonation();
    navigate("/super-admin/tenants", { replace: true });
  }

  return (
    <div className="flex items-center justify-between gap-3 bg-amber-500/15 px-4 py-2 text-sm text-amber-800 dark:text-amber-300">
      <span className="flex items-center gap-1.5">
        <EyeIcon size={15} strokeWidth={1.8} />
        Viewing as <strong className="font-semibold">{impersonation.tenantName}</strong> — actions here affect their real
        data.
      </span>
      <button
        type="button"
        onClick={handleExit}
        className="flex items-center gap-1.5 rounded-md bg-amber-500/20 px-2.5 py-1 text-xs font-medium transition-colors hover:bg-amber-500/30"
      >
        <Logout03Icon size={13} strokeWidth={1.8} />
        Exit to Super Admin
      </button>
    </div>
  );
}
