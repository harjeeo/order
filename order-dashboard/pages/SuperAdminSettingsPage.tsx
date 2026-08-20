import { useEffect, useState } from "react";
import { CheckmarkCircle02Icon, SquareLock02Icon } from "hugeicons-react";
import { getPlatformSettings, updatePlatformSettings, changePassword, TENANT_PLANS } from "../lib/api";

const inputClass =
  "rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)";

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-(--color-text-muted)">{label}</span>
      {children}
    </label>
  );
}

export default function SuperAdminSettingsPage() {
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getPlatformSettings().then(setForm);
  }, []);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(t);
  }, [saved]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function setPlanPrice(plan, value) {
    setForm((f) => ({ ...f, planPricing: { ...f.planPricing, [plan]: Number(value) || 0 } }));
  }

  async function handleSave() {
    const updated = await updatePlatformSettings(form);
    setForm(updated);
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

  if (!form) return null;

  return (
    <div className="px-10 py-8">
      <h1 className="text-2xl font-semibold">Platform Settings</h1>
      <p className="mt-1 text-sm text-(--color-text-muted)">Configuration that applies across every client.</p>

      <div className="mt-6 max-w-lg space-y-4">
        <Field label="Platform Name">
          <input value={form.platformName} onChange={(e) => set("platformName", e.target.value)} className={inputClass} />
        </Field>

        <Field label="Support Email">
          <input value={form.supportEmail} onChange={(e) => set("supportEmail", e.target.value)} className={inputClass} />
        </Field>

        <Field label="Billing Email">
          <input value={form.billingEmail} onChange={(e) => set("billingEmail", e.target.value)} className={inputClass} />
        </Field>

        <Field label="Trial Period (days)">
          <input
            type="number"
            value={form.trialDays}
            onChange={(e) => set("trialDays", Number(e.target.value))}
            className={`${inputClass} w-24`}
          />
        </Field>

        <div>
          <div className="text-xs text-(--color-text-muted)">Plan Pricing (₹ / month)</div>
          <div className="mt-2 flex gap-3">
            {TENANT_PLANS.map((plan) => (
              <label key={plan} className="flex flex-col gap-1">
                <span className="text-xs text-(--color-text-muted)">{plan}</span>
                <input
                  type="number"
                  value={form.planPricing[plan]}
                  onChange={(e) => setPlanPrice(plan, e.target.value)}
                  className={`${inputClass} w-24`}
                />
              </label>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.allowSelfSignup}
            onChange={(e) => set("allowSelfSignup", e.target.checked)}
          />
          Allow new cafes to self sign up (instead of Super Admin-only onboarding)
        </label>
        <p className="-mt-2 text-xs text-(--color-text-muted)">
          When enabled, anyone can create their own cafe account at{" "}
          <span className="font-mono text-(--color-text)">/signup</span>. When off, that page still loads but the
          server rejects new sign-ups until this is turned back on.
        </p>

        <div className="flex items-center gap-3 pt-2">
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

        <div className="mt-8 border-t border-(--color-border) pt-6">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold">
            <SquareLock02Icon size={15} strokeWidth={1.8} />
            My Account
          </h2>
          <p className="mt-1 text-xs text-(--color-text-muted)">Change the password for your own Super Admin login.</p>

          <div className="mt-4 flex flex-col gap-3">
            <Field label="Current Password">
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="New Password">
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} />
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
        </div>
      </div>
    </div>
  );
}
