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

// Real PDF generation via jsPDF for "Download Invoice" — produces an
// actual .pdf file rather than relying on the browser's print-to-PDF
// dialog. Loaded lazily so it doesn't add to the initial bundle.
export async function downloadInvoicePdf(r: InvoiceReceipt, filename: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: [227, 600] }); // ~80mm wide receipt
  const marginX = 14;
  let y = 24;

  doc.setFont("courier", "bold");
  doc.setFontSize(13);
  doc.text(r.restaurantName ?? "Order Dashboard", 113.5, y, { align: "center" });
  y += 16;

  doc.setFont("courier", "normal");
  doc.setFontSize(9);
  const meta = `Invoice ${r.invoiceNumber}${r.orderNumber ? ` · ${r.orderNumber}` : ""}`;
  doc.text(meta, 113.5, y, { align: "center" });
  y += 12;
  if (r.customer) {
    doc.text(r.customer, 113.5, y, { align: "center" });
    y += 12;
  }
  doc.text(new Date().toLocaleString(), 113.5, y, { align: "center" });
  y += 10;

  doc.setLineDashPattern([2, 2], 0);
  doc.line(marginX, y, 227 - marginX, y);
  y += 14;

  if (r.items?.length) {
    doc.setFontSize(9);
    for (const item of r.items) {
      doc.text(`${item.qty}x`, marginX, y);
      doc.text(item.name, marginX + 24, y);
      y += 13;
    }
    doc.setLineDashPattern([2, 2], 0);
    doc.line(marginX, y, 227 - marginX, y);
    y += 14;
  }

  const line = (label: string, value: string, bold = false) => {
    doc.setFont("courier", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 11 : 9);
    doc.text(label, marginX, y);
    doc.text(value, 227 - marginX, y, { align: "right" });
    y += bold ? 15 : 13;
  };

  if (r.subtotal != null) line("Subtotal", formatCurrency(r.subtotal));
  if (r.discountAmount) line("Discount", `-${formatCurrency(r.discountAmount)}`);
  if (r.serviceChargeAmount) line("Service Charge", formatCurrency(r.serviceChargeAmount));
  if (r.taxAmount != null) line("Tax", formatCurrency(r.taxAmount));
  y += 3;
  line("Total", formatCurrency(r.total), true);
  if (r.method) line("Paid via", r.method.toUpperCase());

  y += 10;
  doc.setFont("courier", "normal");
  doc.setFontSize(9);
  doc.text("Thank you for visiting!", 113.5, y, { align: "center" });

  doc.save(filename);
}
