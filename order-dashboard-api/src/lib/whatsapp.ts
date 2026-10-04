import { prisma } from "../prisma";
import { PLATFORM_SETTINGS_SINGLETON_ID } from "./platformSettingsId";

// One shared WhatsApp Business (Meta Cloud API) sender number for the whole
// platform — every tenant's bill receipt goes out from it, configured once
// by the Super Admin (see email.ts/sms.ts for the same "configure now,
// activate later" pattern).
export interface WhatsAppSettings {
  enabled: boolean;
  phoneNumberId: string;
  accessToken: string;
  templateName: string;
  languageCode: string;
}

const DEFAULT_WHATSAPP_SETTINGS: WhatsAppSettings = {
  enabled: false,
  phoneNumberId: "",
  accessToken: "",
  templateName: "bill_receipt",
  languageCode: "en",
};

export async function getWhatsAppSettings(): Promise<WhatsAppSettings> {
  const settings = await prisma.platformSettings.findUnique({ where: { id: PLATFORM_SETTINGS_SINGLETON_ID } });
  const raw = (settings?.whatsappSettings as Partial<WhatsAppSettings>) ?? {};
  return { ...DEFAULT_WHATSAPP_SETTINGS, ...raw };
}

export interface SendWhatsAppResult {
  ok: boolean;
  error?: string;
}

// Meta only allows a business-initiated message (one the customer didn't
// just message first) through a pre-approved template — free-form text is
// rejected outside a customer-opened 24h window. The template's own body
// defines what {{1}}..{{4}} mean on Meta's side; this just has to supply
// them in the same order the template was approved with:
// {{1}} customer name, {{2}} cafe name, {{3}} order number, {{4}} amount.
export async function sendWhatsAppBill(
  tenantId: string,
  to: string,
  params: { customerName: string; cafeName: string; orderNumber: string; amount: number }
): Promise<SendWhatsAppResult> {
  const settings = await getWhatsAppSettings();
  let result: SendWhatsAppResult;

  if (!settings.enabled) {
    result = { ok: false, error: "WhatsApp bill receipts are not enabled" };
  } else if (!settings.phoneNumberId || !settings.accessToken) {
    result = { ok: false, error: "WhatsApp Phone Number ID/Access Token not set" };
  } else {
    try {
      const res = await fetch(`https://graph.facebook.com/v20.0/${settings.phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: to.replace(/[^\d+]/g, ""),
          type: "template",
          template: {
            name: settings.templateName,
            language: { code: settings.languageCode },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: params.customerName },
                  { type: "text", text: params.cafeName },
                  { type: "text", text: params.orderNumber },
                  { type: "text", text: `₹${params.amount}` },
                ],
              },
            ],
          },
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        result = { ok: false, error: `WhatsApp API ${res.status}: ${body.slice(0, 300)}` };
      } else {
        result = { ok: true };
      }
    } catch (err: any) {
      result = { ok: false, error: err?.message ?? "Failed to send WhatsApp message" };
    }
  }

  const message = `Bill receipt: ${params.cafeName}, order ${params.orderNumber}, ₹${params.amount}`;
  await prisma.notificationLog
    .create({
      data: { tenantId, channel: "whatsapp", to, message, status: result.ok ? "sent" : "logged" },
    })
    .catch(() => {});

  return result;
}
