import { prisma } from "../prisma";
import { PLATFORM_SETTINGS_SINGLETON_ID } from "./platformSettingsId";
import { buildBillPdf, BillPdfInput } from "./billPdf";

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

const GRAPH_API_BASE = "https://graph.facebook.com/v20.0";

// Attaches the PDF to the account's media library first — WhatsApp
// template messages reference a document by its uploaded media id, not by
// sending raw bytes inline.
async function uploadPdf(settings: WhatsAppSettings, pdf: Buffer, filename: string): Promise<{ id: string } | { error: string }> {
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", "application/pdf");
  form.append("file", new Blob([pdf], { type: "application/pdf" }), filename);

  const res = await fetch(`${GRAPH_API_BASE}/${settings.phoneNumberId}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${settings.accessToken}` },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { error: `WhatsApp media upload ${res.status}: ${body.slice(0, 300)}` };
  }
  const data = (await res.json()) as { id: string };
  return { id: data.id };
}

export interface WhatsAppBillParams {
  customerName: string;
  cafeName: string;
  orderNumber: string;
  amount: number;
  bill: BillPdfInput;
}

// Meta only allows a business-initiated message (one the customer didn't
// just message first) through a pre-approved template — free-form text
// and ad-hoc attachments are rejected outside a customer-opened 24h
// window. The template's own header/body define what the document and
// {{1}}..{{4}} mean on Meta's side; this just has to supply them in the
// same order the template was approved with: header = the bill PDF,
// body {{1}} customer name, {{2}} cafe name, {{3}} order number,
// {{4}} amount.
export async function sendWhatsAppBill(tenantId: string, to: string, params: WhatsAppBillParams): Promise<SendWhatsAppResult> {
  const settings = await getWhatsAppSettings();
  let result: SendWhatsAppResult;

  if (!settings.enabled) {
    result = { ok: false, error: "WhatsApp bill receipts are not enabled" };
  } else if (!settings.phoneNumberId || !settings.accessToken) {
    result = { ok: false, error: "WhatsApp Phone Number ID/Access Token not set" };
  } else {
    try {
      const pdf = await buildBillPdf(params.bill);
      const uploaded = await uploadPdf(settings, pdf, `Bill-${params.orderNumber}.pdf`);

      if ("error" in uploaded) {
        result = { ok: false, error: uploaded.error };
      } else {
        const res = await fetch(`${GRAPH_API_BASE}/${settings.phoneNumberId}/messages`, {
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
                  type: "header",
                  parameters: [{ type: "document", document: { id: uploaded.id, filename: `Bill-${params.orderNumber}.pdf` } }],
                },
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
