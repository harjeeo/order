import { useEffect, useState } from "react";
import { CheckmarkCircle02Icon, SquareLock02Icon, MailSend02Icon, SmartPhone01Icon, ViewIcon, ViewOffIcon } from "hugeicons-react";
import {
  getPlatformSettings,
  updatePlatformSettings,
  changePassword,
  sendTestEmail,
  sendTestSms,
  TENANT_PLANS,
  EMAIL_PROVIDERS,
  SMS_PROVIDERS,
} from "../lib/api";

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

  const [showSecret, setShowSecret] = useState({});
  const [testEmailTo, setTestEmailTo] = useState("");
  const [testEmailStatus, setTestEmailStatus] = useState(null); // { ok: boolean, message: string } | null
  const [testingEmail, setTestingEmail] = useState(false);

  function setEmailField(field, value) {
    setForm((f) => ({ ...f, emailSettings: { ...f.emailSettings, [field]: value } }));
  }

  function setEmailProviderField(provider, field, value) {
    setForm((f) => ({
      ...f,
      emailSettings: {
        ...f.emailSettings,
        [provider]: { ...f.emailSettings[provider], [field]: value },
      },
    }));
  }

  async function handleSendTestEmail() {
    setTestEmailStatus(null);
    if (!testEmailTo.trim()) {
      setTestEmailStatus({ ok: false, message: "Enter an email address to send the test to." });
      return;
    }
    setTestingEmail(true);
    try {
      await sendTestEmail(testEmailTo.trim());
      setTestEmailStatus({ ok: true, message: `Test email sent to ${testEmailTo.trim()}.` });
    } catch (err) {
      setTestEmailStatus({ ok: false, message: err instanceof Error ? err.message : "Could not send test email" });
    } finally {
      setTestingEmail(false);
    }
  }

  const [testSmsTo, setTestSmsTo] = useState("");
  const [testSmsStatus, setTestSmsStatus] = useState(null); // { ok: boolean, message: string } | null
  const [testingSms, setTestingSms] = useState(false);

  function setSmsField(field, value) {
    setForm((f) => ({ ...f, smsSettings: { ...f.smsSettings, [field]: value } }));
  }

  function setSmsProviderField(provider, field, value) {
    setForm((f) => ({
      ...f,
      smsSettings: {
        ...f.smsSettings,
        [provider]: { ...f.smsSettings[provider], [field]: value },
      },
    }));
  }

  async function handleSendTestSms() {
    setTestSmsStatus(null);
    if (!testSmsTo.trim()) {
      setTestSmsStatus({ ok: false, message: "Enter a phone number to send the test to." });
      return;
    }
    setTestingSms(true);
    try {
      await sendTestSms(testSmsTo.trim());
      setTestSmsStatus({ ok: true, message: `Test SMS sent to ${testSmsTo.trim()}.` });
    } catch (err) {
      setTestSmsStatus({ ok: false, message: err instanceof Error ? err.message : "Could not send test SMS" });
    } finally {
      setTestingSms(false);
    }
  }

  if (!form) return null;

  const activeProvider = EMAIL_PROVIDERS.find((p) => p.key === form.emailSettings?.provider) ?? EMAIL_PROVIDERS[0];
  const activeSmsProvider = SMS_PROVIDERS.find((p) => p.key === form.smsSettings?.provider) ?? SMS_PROVIDERS[0];

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

        <div className="border-t border-(--color-border) pt-6">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold">
            <MailSend02Icon size={15} strokeWidth={1.8} />
            Email / API
          </h2>
          <p className="mt-1 text-xs text-(--color-text-muted)">
            Automatically email a new client or staff member's login credentials instead of copying and sending them
            manually. Pick a provider, add its API key, and save.
          </p>

          <div className="mt-4 flex flex-col gap-3">
            <Field label="Provider">
              <select
                value={form.emailSettings?.provider ?? "none"}
                onChange={(e) => setEmailField("provider", e.target.value)}
                className={`${inputClass} w-56`}
              >
                {EMAIL_PROVIDERS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>

            {activeProvider.key !== "none" && (
              <>
                <div className="flex gap-3">
                  <Field label="From Name">
                    <input
                      value={form.emailSettings?.fromName ?? ""}
                      onChange={(e) => setEmailField("fromName", e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="From Email">
                    <input
                      type="email"
                      value={form.emailSettings?.fromEmail ?? ""}
                      onChange={(e) => setEmailField("fromEmail", e.target.value)}
                      placeholder="noreply@yourdomain.com"
                      className={inputClass}
                    />
                  </Field>
                </div>

                {activeProvider.fields.map((f) => {
                  const secretId = `${activeProvider.key}.${f.key}`;
                  const revealed = !!showSecret[secretId];
                  return (
                    <Field key={f.key} label={`${activeProvider.label} ${f.label}`}>
                      <div className="relative">
                        <input
                          type={revealed ? "text" : "password"}
                          value={form.emailSettings?.[activeProvider.key]?.[f.key] ?? ""}
                          onChange={(e) => setEmailProviderField(activeProvider.key, f.key, e.target.value)}
                          placeholder="Paste API key here"
                          className={`${inputClass} w-full pr-9`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecret((s) => ({ ...s, [secretId]: !s[secretId] }))}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-(--color-text-muted)"
                        >
                          {revealed ? <ViewOffIcon size={15} strokeWidth={1.8} /> : <ViewIcon size={15} strokeWidth={1.8} />}
                        </button>
                      </div>
                    </Field>
                  );
                })}
              </>
            )}
          </div>
        </div>

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

        {activeProvider.key !== "none" && (
          <div className="rounded-lg border border-(--color-border) p-3">
            <div className="text-xs font-medium text-(--color-text-muted)">Send a test email</div>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="email"
                value={testEmailTo}
                onChange={(e) => setTestEmailTo(e.target.value)}
                placeholder="you@example.com"
                className={`${inputClass} flex-1`}
              />
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={testingEmail}
                className="flex shrink-0 items-center gap-1.5 rounded-md border border-(--color-border) px-3 py-2 text-sm font-medium text-(--color-text) transition-colors hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10"
              >
                <MailSend02Icon size={14} strokeWidth={1.8} />
                {testingEmail ? "Sending…" : "Send Test"}
              </button>
            </div>
            {testEmailStatus && (
              <div className={`mt-2 text-xs ${testEmailStatus.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                {testEmailStatus.message}
              </div>
            )}
            <p className="mt-2 text-[11px] text-(--color-text-muted)">
              Save your API key above first — the test uses whatever is currently saved, not the unsaved form.
            </p>
          </div>
        )}

        <div className="mt-2 border-t border-(--color-border) pt-6">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold">
            <SmartPhone01Icon size={15} strokeWidth={1.8} />
            SMS / WhatsApp
          </h2>
          <p className="mt-1 text-xs text-(--color-text-muted)">
            Text customers automatically when their order is ready or their bill is paid — sent from whichever cafe's
            order it is, using whatever phone number is on the customer record.
          </p>

          <div className="mt-4 flex flex-col gap-3">
            <Field label="Provider">
              <select
                value={form.smsSettings?.provider ?? "none"}
                onChange={(e) => setSmsField("provider", e.target.value)}
                className={`${inputClass} w-56`}
              >
                {SMS_PROVIDERS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>

            {activeSmsProvider.key !== "none" &&
              activeSmsProvider.fields.map((f) => {
                const secretId = `sms.${activeSmsProvider.key}.${f.key}`;
                const revealed = !!showSecret[secretId];
                return (
                  <Field key={f.key} label={`${activeSmsProvider.label} ${f.label}`}>
                    <div className="relative">
                      <input
                        type={revealed ? "text" : "password"}
                        value={form.smsSettings?.[activeSmsProvider.key]?.[f.key] ?? ""}
                        onChange={(e) => setSmsProviderField(activeSmsProvider.key, f.key, e.target.value)}
                        placeholder="Paste value here"
                        className={`${inputClass} w-full pr-9`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret((s) => ({ ...s, [secretId]: !s[secretId] }))}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-(--color-text-muted)"
                      >
                        {revealed ? <ViewOffIcon size={15} strokeWidth={1.8} /> : <ViewIcon size={15} strokeWidth={1.8} />}
                      </button>
                    </div>
                  </Field>
                );
              })}
          </div>
        </div>

        {activeSmsProvider.key !== "none" && (
          <div className="rounded-lg border border-(--color-border) p-3">
            <div className="text-xs font-medium text-(--color-text-muted)">Send a test SMS</div>
            <div className="mt-2 flex items-center gap-2">
              <input
                value={testSmsTo}
                onChange={(e) => setTestSmsTo(e.target.value)}
                placeholder="+919876543210"
                className={`${inputClass} flex-1`}
              />
              <button
                type="button"
                onClick={handleSendTestSms}
                disabled={testingSms}
                className="flex shrink-0 items-center gap-1.5 rounded-md border border-(--color-border) px-3 py-2 text-sm font-medium text-(--color-text) transition-colors hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10"
              >
                <SmartPhone01Icon size={14} strokeWidth={1.8} />
                {testingSms ? "Sending…" : "Send Test"}
              </button>
            </div>
            {testSmsStatus && (
              <div className={`mt-2 text-xs ${testSmsStatus.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                {testSmsStatus.message}
              </div>
            )}
            <p className="mt-2 text-[11px] text-(--color-text-muted)">
              Save your provider credentials above first — the test uses whatever is currently saved.
            </p>
          </div>
        )}

        <div className="mt-2 border-t border-(--color-border) pt-6">
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
