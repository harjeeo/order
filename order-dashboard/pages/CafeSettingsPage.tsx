import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  Store01Icon,
  PercentIcon,
  Invoice01Icon,
  KitchenUtensilsIcon,
  PrinterIcon,
  CreditCardIcon,
  SquareLock02Icon,
  CheckmarkCircle02Icon,
  Building02Icon,
  CouponPercentIcon,
  LanguageCircleIcon,
  Sun03Icon,
  Moon02Icon,
} from "hugeicons-react";
import {
  getSettings,
  updateSettings,
  changePassword,
  getOutlets,
  createOutlet,
  setCurrentOutletId,
  getCoupons,
  createCoupon,
  setCouponActive,
  getTwoFactorStatus,
  startTwoFactorSetup,
  enableTwoFactor,
  disableTwoFactor,
  getMyProfile,
} from "../lib/api";
import { useTranslation } from "../lib/i18n";
import { useTheme } from "../lib/useTheme";

const TABS = [
  { key: "restaurant", label: "Restaurant Profile", icon: Store01Icon },
  { key: "tax", label: "GST / Tax", icon: PercentIcon },
  { key: "invoice", label: "Invoice", icon: Invoice01Icon },
  { key: "kot", label: "KOT", icon: KitchenUtensilsIcon },
  { key: "printer", label: "Printer", icon: PrinterIcon },
  { key: "paymentMethods", label: "Payment Methods", icon: CreditCardIcon },
  { key: "coupons", label: "Coupons", icon: CouponPercentIcon },
  { key: "outlets", label: "Outlets (Pro)", icon: Building02Icon },
  { key: "language", label: "Language", icon: LanguageCircleIcon },
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
  const [tenantSlug, setTenantSlug] = useState("");

  async function refresh() {
    const data = await getSettings();
    setSettings(data);
  }

  useEffect(() => {
    refresh();
    getMyProfile().then((me: any) => setTenantSlug(me.tenantSlug ?? ""));
  }, []);

  const publicMenuUrl = tenantSlug ? `${window.location.origin}/menu/${tenantSlug}` : "";

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

  const [outlets, setOutlets] = useState([]);
  const [newOutletName, setNewOutletName] = useState("");
  const [newOutletAddress, setNewOutletAddress] = useState("");

  async function refreshOutlets() {
    setOutlets(await getOutlets());
  }

  useEffect(() => {
    if (tab === "outlets") refreshOutlets();
  }, [tab]);

  async function handleAddOutlet() {
    if (!newOutletName.trim()) return;
    await createOutlet({ name: newOutletName.trim(), address: newOutletAddress.trim() });
    setNewOutletName("");
    setNewOutletAddress("");
    refreshOutlets();
  }

  function handleSwitchOutlet(outletId) {
    setCurrentOutletId(outletId);
    window.location.href = "/cafe";
  }

  const [coupons, setCoupons] = useState([]);
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponType, setNewCouponType] = useState("percent");
  const [newCouponValue, setNewCouponValue] = useState("");
  const [newCouponMaxUses, setNewCouponMaxUses] = useState("");
  const [couponError, setCouponError] = useState("");

  async function refreshCoupons() {
    setCoupons(await getCoupons());
  }

  useEffect(() => {
    if (tab === "coupons") refreshCoupons();
  }, [tab]);

  async function handleAddCoupon() {
    setCouponError("");
    if (!newCouponCode.trim() || !newCouponValue) return;
    try {
      await createCoupon({
        code: newCouponCode.trim(),
        type: newCouponType,
        value: Number(newCouponValue),
        maxUses: newCouponMaxUses ? Number(newCouponMaxUses) : null,
      });
      setNewCouponCode("");
      setNewCouponValue("");
      setNewCouponMaxUses("");
      refreshCoupons();
    } catch (err) {
      setCouponError(err instanceof Error ? err.message : "Could not create coupon");
    }
  }

  async function handleToggleCoupon(coupon) {
    await setCouponActive(coupon._id, !coupon.active);
    refreshCoupons();
  }

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorSetup, setTwoFactorSetup] = useState(null); // { secret, otpauthUrl, qrDataUrl }
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorError, setTwoFactorError] = useState("");

  useEffect(() => {
    if (tab === "account") getTwoFactorStatus().then((s) => setTwoFactorEnabled(s.enabled));
  }, [tab]);

  async function handleStartTwoFactorSetup() {
    setTwoFactorError("");
    const setup = await startTwoFactorSetup();
    const qrDataUrl = await QRCode.toDataURL(setup.otpauthUrl, { width: 200, margin: 1 });
    setTwoFactorSetup({ ...setup, qrDataUrl });
  }

  async function handleEnableTwoFactor() {
    setTwoFactorError("");
    try {
      await enableTwoFactor(twoFactorCode.trim());
      setTwoFactorEnabled(true);
      setTwoFactorSetup(null);
      setTwoFactorCode("");
    } catch (err) {
      setTwoFactorError(err instanceof Error ? err.message : "Invalid code");
    }
  }

  async function handleDisableTwoFactor() {
    setTwoFactorError("");
    try {
      await disableTwoFactor(twoFactorCode.trim());
      setTwoFactorEnabled(false);
      setTwoFactorCode("");
    } catch (err) {
      setTwoFactorError(err instanceof Error ? err.message : "Invalid code");
    }
  }

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

  const { lang, setLanguage } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  if (!settings) return null;
  if (tab !== "account" && tab !== "outlets" && tab !== "coupons" && tab !== "language" && !draft) return null;

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
              <Field label="About (shown on your public menu page)">
                <textarea
                  value={draft.about ?? ""}
                  onChange={(e) => set("about", e.target.value)}
                  rows={2}
                  placeholder="A short line about your cafe — cuisine, vibe, specialty."
                  className={`${inputClass} resize-none`}
                />
              </Field>

              {tenantSlug && (
                <div className="mt-2 rounded-md border border-(--color-border) p-3">
                  <div className="text-xs font-medium text-(--color-text-muted)">Your public menu link</div>
                  <p className="mt-1 text-xs text-(--color-text-muted)">
                    Share this in your Instagram bio or anywhere on social — anyone can browse your menu and order
                    without scanning a table QR code.
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="flex-1 truncate rounded-md bg-black/5 px-2 py-1.5 text-xs dark:bg-white/10">
                      {publicMenuUrl}
                    </code>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(publicMenuUrl)}
                      className="shrink-0 rounded-md border border-(--color-border) px-2.5 py-1.5 text-xs font-medium"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
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
              <Field label="UPI ID (for the payment QR on Billing)">
                <input
                  value={draft.upiId ?? ""}
                  onChange={(e) => set("upiId", e.target.value)}
                  placeholder="cafename@upi"
                  className={inputClass}
                />
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

          {tab === "coupons" && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-(--color-text-muted)">
                Discount codes staff can apply on the Billing page (e.g. "WELCOME10").
              </p>

              <div className="flex flex-col gap-2">
                {coupons.map((c) => (
                  <div
                    key={c._id}
                    className="flex items-center justify-between rounded-md border border-(--color-border) px-3 py-2"
                  >
                    <div>
                      <div className="text-sm font-medium">
                        {c.code}
                        {!c.active && (
                          <span className="ml-1.5 rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] text-(--color-text-muted) dark:bg-white/10">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-(--color-text-muted)">
                        {c.type === "percent" ? `${c.value}% off` : `₹${c.value} off`}
                        {c.maxUses != null && ` · ${c.usedCount}/${c.maxUses} used`}
                        {c.maxUses == null && c.usedCount > 0 && ` · used ${c.usedCount}×`}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleCoupon(c)}
                      className="rounded-md border border-(--color-border) px-3 py-1 text-xs"
                    >
                      {c.active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                ))}
                {coupons.length === 0 && <p className="text-sm text-(--color-text-muted)">No coupons yet.</p>}
              </div>

              <div className="rounded-md border border-(--color-border) p-3">
                <div className="text-xs font-medium text-(--color-text-muted)">Create a coupon</div>
                {couponError && <p className="mt-1 text-xs text-red-500">{couponError}</p>}
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <Field label="Code">
                    <input
                      placeholder="WELCOME10"
                      value={newCouponCode}
                      onChange={(e) => setNewCouponCode(e.target.value)}
                      className={`${inputClass} w-32`}
                    />
                  </Field>
                  <Field label="Type">
                    <select
                      value={newCouponType}
                      onChange={(e) => setNewCouponType(e.target.value)}
                      className={`${inputClass} w-28`}
                    >
                      <option value="percent">% off</option>
                      <option value="fixed">₹ off</option>
                    </select>
                  </Field>
                  <Field label="Value">
                    <input
                      type="number"
                      value={newCouponValue}
                      onChange={(e) => setNewCouponValue(e.target.value)}
                      className={`${inputClass} w-20`}
                    />
                  </Field>
                  <Field label="Max uses (optional)">
                    <input
                      type="number"
                      value={newCouponMaxUses}
                      onChange={(e) => setNewCouponMaxUses(e.target.value)}
                      className={`${inputClass} w-28`}
                    />
                  </Field>
                  <button
                    type="button"
                    onClick={handleAddCoupon}
                    disabled={!newCouponCode.trim() || !newCouponValue}
                    className="rounded-md bg-(--color-accent) px-3 py-2 text-xs font-medium text-white disabled:opacity-40"
                  >
                    Add Coupon
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === "outlets" && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-(--color-text-muted)">
                Run more than one branch under this account. Staff share one login and switch between outlets — each
                has its own menu, tables and inventory.
              </p>

              <div className="flex flex-col gap-2">
                {outlets.map((o) => (
                  <div
                    key={o._id}
                    className="flex items-center justify-between rounded-md border border-(--color-border) px-3 py-2"
                  >
                    <div>
                      <div className="text-sm font-medium">
                        {o.name}
                        {o.isDefault && (
                          <span className="ml-1.5 rounded-full bg-(--color-accent)/10 px-1.5 py-0.5 text-[10px] text-(--color-accent)">
                            Default
                          </span>
                        )}
                      </div>
                      {o.address && <div className="text-xs text-(--color-text-muted)">{o.address}</div>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSwitchOutlet(o._id)}
                      className="rounded-md border border-(--color-border) px-3 py-1 text-xs"
                    >
                      Switch to this outlet
                    </button>
                  </div>
                ))}
                {outlets.length === 0 && <p className="text-sm text-(--color-text-muted)">Loading…</p>}
              </div>

              <div className="rounded-md border border-(--color-border) p-3">
                <div className="text-xs font-medium text-(--color-text-muted)">Add a new outlet</div>
                <div className="mt-2 flex flex-col gap-2">
                  <input
                    placeholder="Outlet name (e.g. HSR Layout Branch)"
                    value={newOutletName}
                    onChange={(e) => setNewOutletName(e.target.value)}
                    className={inputClass}
                  />
                  <input
                    placeholder="Address (optional)"
                    value={newOutletAddress}
                    onChange={(e) => setNewOutletAddress(e.target.value)}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={handleAddOutlet}
                    disabled={!newOutletName.trim()}
                    className="w-fit rounded-md bg-(--color-accent) px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                  >
                    Add Outlet
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === "language" && (
            <div className="flex flex-col gap-6">
              <div>
                <div className="text-sm font-medium">Language</div>
                <p className="mt-1 text-xs text-(--color-text-muted)">Choose the language for the dashboard.</p>
                <div className="mt-3 flex gap-2">
                  {[
                    { key: "en" as const, label: "English" },
                    { key: "hi" as const, label: "हिन्दी" },
                  ].map((l) => (
                    <button
                      key={l.key}
                      type="button"
                      onClick={() => setLanguage(l.key)}
                      className={`rounded-md border px-4 py-2 text-sm font-medium ${
                        lang === l.key
                          ? "border-(--color-accent) bg-(--color-accent)/10 text-(--color-accent)"
                          : "border-(--color-border) text-(--color-text)"
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium">Appearance</div>
                <p className="mt-1 text-xs text-(--color-text-muted)">Switch between light and dark mode.</p>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="mt-3 flex items-center gap-2 rounded-md border border-(--color-border) px-4 py-2 text-sm font-medium"
                >
                  {theme === "dark" ? <Sun03Icon size={16} strokeWidth={1.8} /> : <Moon02Icon size={16} strokeWidth={1.8} />}
                  {theme === "dark" ? "Switch to Light mode" : "Switch to Dark mode"}
                </button>
              </div>
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

              <div className="mt-4 border-t border-(--color-border) pt-4">
                <div className="text-sm font-medium">Two-Factor Authentication</div>
                <p className="mt-1 text-xs text-(--color-text-muted)">
                  Require a 6-digit code from an authenticator app (Google Authenticator, Authy, etc.) at login.
                </p>

                {twoFactorError && <p className="mt-2 text-xs text-red-500">{twoFactorError}</p>}

                {twoFactorEnabled ? (
                  <div className="mt-3 flex flex-col gap-2">
                    <span className="flex w-fit items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                      <CheckmarkCircle02Icon size={11} strokeWidth={1.8} />
                      Enabled
                    </span>
                    <div className="flex items-center gap-1.5">
                      <input
                        value={twoFactorCode}
                        onChange={(e) => setTwoFactorCode(e.target.value)}
                        placeholder="Enter code to disable"
                        maxLength={6}
                        className="w-40 rounded-md border border-(--color-border) bg-transparent px-2 py-1.5 text-sm outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleDisableTwoFactor}
                        disabled={twoFactorCode.length !== 6}
                        className="rounded-md border border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-500 disabled:opacity-40"
                      >
                        Disable
                      </button>
                    </div>
                  </div>
                ) : twoFactorSetup ? (
                  <div className="mt-3 flex flex-col items-start gap-2">
                    <img src={twoFactorSetup.qrDataUrl} alt="2FA setup QR code" className="rounded-md" />
                    <p className="text-xs text-(--color-text-muted)">
                      Scan with your authenticator app, then enter the code it shows.
                    </p>
                    <div className="flex items-center gap-1.5">
                      <input
                        value={twoFactorCode}
                        onChange={(e) => setTwoFactorCode(e.target.value)}
                        placeholder="123456"
                        maxLength={6}
                        className="w-32 rounded-md border border-(--color-border) bg-transparent px-2 py-1.5 text-sm outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleEnableTwoFactor}
                        disabled={twoFactorCode.length !== 6}
                        className="rounded-md bg-(--color-accent) px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                      >
                        Confirm & Enable
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartTwoFactorSetup}
                    className="mt-3 rounded-md border border-(--color-border) px-3 py-1.5 text-xs font-medium"
                  >
                    Set up 2FA
                  </button>
                )}
              </div>
            </div>
          )}

          {tab !== "account" && tab !== "outlets" && tab !== "coupons" && tab !== "language" && (
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
