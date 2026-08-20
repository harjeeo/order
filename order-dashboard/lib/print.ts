// Lightweight receipt printing/downloading, no PDF library required.
// Builds a small standalone HTML document styled for an 80mm receipt,
// then either opens it in a new window and triggers the browser print
// dialog (Print KOT / Print Invoice), or downloads it as a standalone
// .html file that opens and prints identically anywhere (Download
// Invoice — a user can "Save as PDF" from the print dialog too).

interface ReceiptItem {
  name: string;
  qty: number;
  notes?: string;
}

interface KotReceipt {
  title?: string;
  orderNumber: string;
  table?: string | null;
  orderType: string;
  items: ReceiptItem[];
  notes?: string;
}

interface InvoiceReceipt {
  restaurantName?: string;
  invoiceNumber: string;
  orderNumber?: string;
  customer?: string;
  items?: ReceiptItem[];
  subtotal?: number;
  discountAmount?: number;
  taxAmount?: number;
  serviceChargeAmount?: number;
  total: number;
  method?: string;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

function formatCurrency(n: number) {
  return `Rs. ${Math.round(n).toLocaleString("en-IN")}`;
}

function wrapDocument(title: string, bodyHtml: string) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; width: 300px; margin: 0 auto; padding: 16px; color: #111; }
  h1 { font-size: 15px; text-align: center; margin: 0 0 4px; }
  .meta { font-size: 11px; text-align: center; color: #444; margin-bottom: 10px; }
  hr { border: none; border-top: 1px dashed #999; margin: 8px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  td { padding: 2px 0; vertical-align: top; }
  .qty { width: 28px; }
  .right { text-align: right; }
  .totals td { padding-top: 4px; }
  .grand { font-weight: bold; font-size: 13px; }
  .footer { text-align: center; font-size: 11px; margin-top: 12px; color: #444; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
${bodyHtml}
<script>window.onload = () => { window.print(); };</script>
</body>
</html>`;
}

export function buildKotHtml(r: KotReceipt) {
  const rows = r.items
    .map(
      (i) =>
        `<tr><td class="qty">${i.qty}x</td><td>${escapeHtml(i.name)}${
          i.notes ? `<div style="color:#666;font-size:10px;">${escapeHtml(i.notes)}</div>` : ""
        }</td></tr>`
    )
    .join("");
  return wrapDocument(r.orderNumber, `
    <h1>${escapeHtml(r.title ?? "KITCHEN ORDER TICKET")}</h1>
    <div class="meta">${escapeHtml(r.orderNumber)} &middot; ${escapeHtml(r.orderType)}${r.table ? ` &middot; ${escapeHtml(r.table)}` : ""}</div>
    <div class="meta">${new Date().toLocaleString()}</div>
    <hr />
    <table>${rows}</table>
    ${r.notes ? `<hr /><div class="meta">Note: ${escapeHtml(r.notes)}</div>` : ""}
  `);
}

export function buildInvoiceHtml(r: InvoiceReceipt) {
  const rows =
    r.items
      ?.map((i) => `<tr><td class="qty">${i.qty}x</td><td>${escapeHtml(i.name)}</td></tr>`)
      .join("") ?? "";
  return wrapDocument(r.invoiceNumber, `
    <h1>${escapeHtml(r.restaurantName ?? "Order Dashboard")}</h1>
    <div class="meta">Invoice ${escapeHtml(r.invoiceNumber)}${r.orderNumber ? ` &middot; ${escapeHtml(r.orderNumber)}` : ""}</div>
    ${r.customer ? `<div class="meta">${escapeHtml(r.customer)}</div>` : ""}
    <div class="meta">${new Date().toLocaleString()}</div>
    <hr />
    ${rows ? `<table>${rows}</table><hr />` : ""}
    <table class="totals">
      ${r.subtotal != null ? `<tr><td>Subtotal</td><td class="right">${formatCurrency(r.subtotal)}</td></tr>` : ""}
      ${r.discountAmount ? `<tr><td>Discount</td><td class="right">-${formatCurrency(r.discountAmount)}</td></tr>` : ""}
      ${r.serviceChargeAmount ? `<tr><td>Service Charge</td><td class="right">${formatCurrency(r.serviceChargeAmount)}</td></tr>` : ""}
      ${r.taxAmount != null ? `<tr><td>Tax</td><td class="right">${formatCurrency(r.taxAmount)}</td></tr>` : ""}
      <tr class="grand"><td>Total</td><td class="right">${formatCurrency(r.total)}</td></tr>
      ${r.method ? `<tr><td>Paid via</td><td class="right">${escapeHtml(r.method.toUpperCase())}</td></tr>` : ""}
    </table>
    <div class="footer">Thank you for visiting!</div>
  `);
}

export function printHtml(html: string) {
  const win = window.open("", "_blank", "width=360,height=640");
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
}

export function downloadHtml(html: string, filename: string) {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
