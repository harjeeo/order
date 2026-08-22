import { prisma } from "../prisma";
import { PLATFORM_SETTINGS_SINGLETON_ID } from "./platformSettingsId";

// Same "configure now, activate later" pattern as email.ts — adding a
// provider is a new key in the default JSON below, a case in sendSms(),
// and a form section on the frontend (SuperAdminSettingsPage). No
// migration needed since it's JSON.
export type SmsProviderKey = "none" | "twilio";

export interface SmsSettings {
  provider: SmsProviderKey;
  twilio: { accountSid: string; authToken: string; fromNumber: string };
}

const DEFAULT_SMS_SETTINGS: SmsSettings = {
  provider: "none",
  twilio: { accountSid: "", authToken: "", fromNumber: "" },
};

export async function getSmsSettings(): Promise<SmsSettings> {
  const settings = await prisma.platformSettings.findUnique({ where: { id: PLATFORM_SETTINGS_SINGLETON_ID } });
  const raw = (settings?.smsSettings as Partial<SmsSettings>) ?? {};
  return {
    ...DEFAULT_SMS_SETTINGS,
    ...raw,
    twilio: { ...DEFAULT_SMS_SETTINGS.twilio, ...raw.twilio },
  };
}

export interface SendSmsResult {
  ok: boolean;
  provider: SmsProviderKey;
  error?: string;
}

async function sendViaTwilio(settings: SmsSettings, to: string, body: string): Promise<SendSmsResult> {
  const { accountSid, authToken, fromNumber } = settings.twilio;
  if (!accountSid || !authToken) return { ok: false, provider: "twilio", error: "Twilio Account SID/Auth Token not set" };
  if (!fromNumber) return { ok: false, provider: "twilio", error: "Twilio From Number not set" };

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
    },
    body: new URLSearchParams({ To: to, From: fromNumber, Body: body }).toString(),
  });

  if (!res.ok) {
    const responseBody = await res.text().catch(() => "");
    return { ok: false, provider: "twilio", error: `Twilio ${res.status}: ${responseBody.slice(0, 300)}` };
  }
  return { ok: true, provider: "twilio" };
}

// Never throws — every caller treats notifications as best-effort and just
// checks `ok`. Every attempt is recorded in NotificationLog regardless of
// whether a real provider is configured, so "order ready"/"bill paid"
// notifications have a visible history even before SMS is switched on.
export async function sendSms(tenantId: string, to: string, body: string): Promise<SendSmsResult> {
  const settings = await getSmsSettings();
  let result: SendSmsResult;

  try {
    switch (settings.provider) {
      case "twilio":
        result = await sendViaTwilio(settings, to, body);
        break;
      case "none":
      default:
        result = { ok: false, provider: "none", error: "No SMS provider configured" };
    }
  } catch (err: any) {
    result = { ok: false, provider: settings.provider, error: err?.message ?? "Failed to send SMS" };
  }

  await prisma.notificationLog
    .create({
      data: { tenantId, channel: "sms", to, message: body, status: result.ok ? "sent" : "logged" },
    })
    .catch(() => {});

  return result;
}
