import { useEffect, useState } from "react";
import {
  Store01Icon,
  PercentIcon,
  Invoice01Icon,
  KitchenUtensilsIcon,
  PrinterIcon,
  CreditCardIcon,
  SquareLock02Icon,
  CheckmarkCircle02Icon,
} from "hugeicons-react";
import { getSettings, updateSettings, changePassword } from "../lib/api";

const TABS = [
  { key: "restaurant", label: "Restaurant Profile", icon: Store01Icon },
  { key: "tax", label: "GST / Tax", icon: PercentIcon },
  { key: "invoice", label: "Invoice", icon: Invoice01Icon },
  { key: "kot", label: "KOT", icon: KitchenUtensilsIcon },
  { key: "printer", label: "Printer", icon: PrinterIcon },
  { key: "paymentMethods", label: "Payment Methods", icon: CreditCardIcon },
  { key: "account", label: "Change Password", icon: SquareLock02Icon },
];

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-(--color-text-muted)">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)";

export default function CafeSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [tab, setTab] = useState("restaurant");
  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState(false);

  async function refresh() {
    const data = await getSettings();
    setSettings(data);
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (settings) setDraft(settings[tab]);
  }, [settings, tab]);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(t);
  }, [saved]);

  function set(field, value) {
    setDraft((d) => ({ ...d, [field]: value }));
  }

  async function handleSave() {
    const updated = await updateSettings(tab, draft);
    setSettings((s) => ({ ...s, [tab]: updated }));
    setSaved(true);
  }

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);

  useEffect(() => {
    if (!passwordSaved) return;
    const t = setTimeout(() => setPasswordSaved(false), 2000);
    return () => clearTimeout(t);
  }, [passwordSaved]);

  async function handleChangePassword() {
    setPasswordError("");
    if (!currentPassword || !newPassword) {
      setPasswordError("Enter your current and new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation don't match.");
      return;
    }
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSaved(true);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Could not change password");
    }
  }

  if (!settings) return null;
  if (tab !== "account" && !draft) return null;

  return (
    <div className="flex h-full">
      <div className="w-56 shrink-0 border-r border-(--color-border) px-3 py-6">
        <h1 className="px-2 text-lg font-semibold">Settings</h1>
        <nav className="mt-4 flex flex-col gap-0.5">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                tab === key
                  ? "bg-black/5 font-medium text-(--color-text) dark:bg-white/10"
                  : "text-(--color-text-muted) hover:bg-black/5 dark:hover:bg-white/10"
              }`}
            >
              <Icon size={16} strokeWidth={1.8} />
              {label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-lg">
          {tab === "restaurant" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-end gap-3">
                <Field label="Logo (emoji)">
                  <input
                    value={draft.logo}
                    onChange={(e) => set("logo", e.target.value)}
                    maxLength={2}
                    className={`${inputClass} w-16 text-center text-xl`}
                  />
                </Field>
                <Field label="Restaurant Name">
                  <input value={draft.name} onChange={(e) => set("name", e.target.value)} className={`${inputClass} w-64`} />
                </Field>
              </div>
              <Field label="Phone">
                <input value={draft.phone} onChange={(e) => set("phone", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Email">
                <input value={draft.email} onChange={(e) => set("email", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Address">
                <textarea
                  value={draft.address}
                  onChange={(e) => set("address", e.target.value)}
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              </Field>
            </div>
          )}

          {tab === "tax" && (
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={draft.applyGst} onChange={(e) => set("applyGst", e.target.checked)} />
                Apply GST to orders
              </label>
              <Field label="GSTIN">
                <input value={draft.gstin} onChange={(e) => set("gstin", e.target.value)} className={inputClass} />
              </Field>
              <div className="flex gap-3">
                <Field label="CGST %">
                  <input
                    type="number"
                    value={draft.cgstPercent}
                    onChange={(e) => set("cgstPercent", Number(e.target.value))}
                    className={`${inputClass} w-24`}
                  />
                </Field>
                <Field label="SGST %">
                  <input
                    type="number"
                    value={draft.sgstPercent}
                    onChange={(e) => set("sgstPercent", Number(e.target.value))}
                    className={`${inputClass} w-24`}
                  />
                </Field>
                <Field label="IGST %">
                  <input
                    type="number"
                    value={draft.igstPercent}
                    onChange={(e) => set("igstPercent", Number(e.target.value))}
                    className={`${inputClass} w-24`}
                  />
                </Field>
              </div>
              <p className="text-xs text-(--color-text-muted)">
                Per-item tax rate and HSN/SAC-relevant category are set on each item in{" "}
                <span className="font-medium text-(--color-text)">Menu Management</span>.
              </p>
            </div>
          )}

          {tab === "invoice" && (
            <div className="flex flex-col gap-3">
              <Field label="Invoice Number Prefix">
                <input value={draft.prefix} onChange={(e) => set("prefix", e.target.value)} className={`${inputClass} w-32`} />
              </Field>
              <Field label="Footer Note">
                <textarea
                  value={draft.footerNote}
                  onChange={(e) => set("footerNote", e.target.value)}
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={draft.showLogo} onChange={(e) => set("showLogo", e.target.checked)} />
                Show logo on printed invoice
              </label>
            </div>
          )}

          {tab === "kot" && (
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={draft.autoPrint} onChange={(e) => set("autoPrint", e.target.checked)} />
                Auto-print KOT when order is sent to kitchen
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={draft.showPrices} onChange={(e) => set("showPrices", e.target.checked)} />
                Show item prices on KOT
              </label>
            </div>
          )}

          {tab === "printer" && (
            <div className="flex flex-col gap-3">
              <Field label="KOT Printer">
                <input value={draft.kotPrinterName} onChange={(e) => set("kotPrinterName", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Bill Printer">
                <input value={draft.billPrinterName} onChange={(e) => set("billPrinterName", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Paper Width">
                <select value={draft.paperWidth} onChange={(e) => set("paperWidth", e.target.value)} className={inputClass}>
                  <option value="58mm">58mm</option>
                  <option value="80mm">80mm</option>
                </select>
              </Field>
            </div>
          )}

          {tab === "paymentMethods" && (
            <div className="flex flex-col gap-2">
              {Object.keys(draft).map((method) => (
                <label
                  key={method}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm capitalize ${
                    draft[method] ? "border-(--color-accent) bg-(--color-accent)/10" : "border-(--color-border)"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={draft[method]}
                    onChange={(e) => set(method, e.target.checked)}
                  />
                  {method}
                </label>
              ))}
            </div>
          )}

          {tab === "account" && (
            <div className="flex flex-col gap-3">
              <Field label="Current Password">
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="New Password">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Confirm New Password">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                />
              </Field>
              {passwordError && <div className="text-xs text-red-500">{passwordError}</div>}
              <div className="mt-1 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleChangePassword}
                  className="rounded-md bg-(--color-accent) px-4 py-2 text-sm font-medium text-white"
                >
                  Update Password
                </button>
                {passwordSaved && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckmarkCircle02Icon size={14} strokeWidth={1.8} />
                    Password updated
                  </span>
                )}
              </div>
            </div>
          )}

          {tab !== "account" && (
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                className="rounded-md bg-(--color-accent) px-4 py-2 text-sm font-medium text-white"
              >
                Save Changes
              </button>
              {saved && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckmarkCircle02Icon size={14} strokeWidth={1.8} />
                  Saved
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
