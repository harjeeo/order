import { prisma } from "../prisma";
import { PLATFORM_SETTINGS_SINGLETON_ID } from "./platformSettingsId";

// Adding a new provider: add its default block to the Prisma
// PlatformSettings.emailSettings JSON default, add a case to the
// switch in sendEmail(), and add a form section on the frontend
// (SuperAdminSettingsPage). No schema migration needed.
export type EmailProviderKey = "none" | "mailjet" | "brevo";

export interface EmailSettings {
  provider: EmailProviderKey;
  fromName: string;
  fromEmail: string;
  mailjet: { apiKey: string; apiSecret: string };
  brevo: { apiKey: string };
}

const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  provider: "none",
  fromName: "Order Dashboard",
  fromEmail: "",
  mailjet: { apiKey: "", apiSecret: "" },
  brevo: { apiKey: "" },
};

export async function getEmailSettings(): Promise<EmailSettings> {
  const settings = await prisma.platformSettings.findUnique({ where: { id: PLATFORM_SETTINGS_SINGLETON_ID } });
  const raw = (settings?.emailSettings as Partial<EmailSettings>) ?? {};
  return {
    ...DEFAULT_EMAIL_SETTINGS,
    ...raw,
    mailjet: { ...DEFAULT_EMAIL_SETTINGS.mailjet, ...raw.mailjet },
    brevo: { ...DEFAULT_EMAIL_SETTINGS.brevo, ...raw.brevo },
  };
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailResult {
  ok: boolean;
  provider: EmailProviderKey;
  error?: string;
}

async function sendViaMailjet(settings: EmailSettings, input: SendEmailInput): Promise<SendEmailResult> {
  const { apiKey, apiSecret } = settings.mailjet;
  if (!apiKey || !apiSecret) return { ok: false, provider: "mailjet", error: "Mailjet API Key/Secret Key not set" };
  if (!settings.fromEmail) return { ok: false, provider: "mailjet", error: "From Email not set" };

  const res = await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`,
    },
    body: JSON.stringify({
      Messages: [
        {
          From: { Email: settings.fromEmail, Name: settings.fromName },
          To: [{ Email: input.to }],
          Subject: input.subject,
          HTMLPart: input.html,
          TextPart: input.text ?? input.html.replace(/<[^>]+>/g, " "),
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, provider: "mailjet", error: `Mailjet ${res.status}: ${body.slice(0, 300)}` };
  }
  return { ok: true, provider: "mailjet" };
}

async function sendViaBrevo(settings: EmailSettings, input: SendEmailInput): Promise<SendEmailResult> {
  const { apiKey } = settings.brevo;
  if (!apiKey) return { ok: false, provider: "brevo", error: "Brevo API Key not set" };
  if (!settings.fromEmail) return { ok: false, provider: "brevo", error: "From Email not set" };

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: { email: settings.fromEmail, name: settings.fromName },
      to: [{ email: input.to }],
      subject: input.subject,
      htmlContent: input.html,
      textContent: input.text ?? input.html.replace(/<[^>]+>/g, " "),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, provider: "brevo", error: `Brevo ${res.status}: ${body.slice(0, 300)}` };
  }
  return { ok: true, provider: "brevo" };
}

// Never throws — callers (tenant creation, password reset, the "send
// test email" button) treat email as best-effort and check `ok`.
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const settings = await getEmailSettings();

  try {
    switch (settings.provider) {
      case "mailjet":
        return await sendViaMailjet(settings, input);
      case "brevo":
        return await sendViaBrevo(settings, input);
      case "none":
      default:
        return { ok: false, provider: "none", error: "No email provider configured" };
    }
  } catch (err: any) {
    return { ok: false, provider: settings.provider, error: err?.message ?? "Failed to send email" };
  }
}

export function credentialsEmailHtml(opts: { cafeName: string; loginPath: string; email: string; tempPassword: string }) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="margin-bottom: 4px;">Welcome to Order Dashboard</h2>
      <p style="color: #555;">Your account for <strong>${opts.cafeName}</strong> is ready.</p>
      <table style="margin-top: 16px; border: 1px solid #e5e5e5; border-radius: 8px; padding: 12px; width: 100%;">
        <tr><td style="color: #888; font-size: 12px; padding: 4px 8px;">Login URL</td></tr>
        <tr><td style="font-family: monospace; padding: 0 8px 8px;">${opts.loginPath}</td></tr>
        <tr><td style="color: #888; font-size: 12px; padding: 4px 8px;">Email</td></tr>
        <tr><td style="font-family: monospace; padding: 0 8px 8px;">${opts.email}</td></tr>
        <tr><td style="color: #888; font-size: 12px; padding: 4px 8px;">Temporary Password</td></tr>
        <tr><td style="font-family: monospace; padding: 0 8px 8px;">${opts.tempPassword}</td></tr>
      </table>
      <p style="color: #888; font-size: 12px; margin-top: 16px;">
        Please sign in and change this password from Settings as soon as possible.
      </p>
    </div>
  `;
}
