import PDFDocument from "pdfkit";

// Mirrors order-dashboard/lib/print.ts's downloadInvoicePdf layout (same
// 80mm-receipt look) — that one runs in the browser for a staff-triggered
// download, this one runs here so the PDF can be generated right after
// settle and attached to the WhatsApp bill receipt without a round trip
// through the client.
export interface BillPdfInput {
  restaurantName: string;
  fssai?: string;
  invoiceNumber: string;
  orderNumber?: string;
  customer?: string;
  items: { name: string; qty: number }[];
  subtotal?: number;
  discountAmount?: number;
  serviceChargeAmount?: number;
  taxAmount?: number;
  total: number;
  method?: string;
}

function formatCurrency(n: number) {
  return `Rs. ${Math.round(n).toLocaleString("en-IN")}`;
}

export async function buildBillPdf(r: BillPdfInput): Promise<Buffer> {
  const width = 227; // ~80mm at 72dpi, matching the client-side PDF
  const marginX = 14;

  // pdfkit needs the page height up front rather than auto-shrinking to
  // content, so this estimates it from what's actually on the receipt
  // (long item names wrap to 2 lines at this width) instead of a fixed
  // size that leaves a half-empty page on a short bill.
  const totalsRowCount =
    (r.subtotal != null ? 1 : 0) + (r.discountAmount ? 1 : 0) + (r.serviceChargeAmount ? 1 : 0) + (r.taxAmount != null ? 1 : 0) + 1 + (r.method ? 1 : 0);
  const estimatedHeight =
    120 + // header block (name/fssai/invoice/customer/date)
    (r.items.length ? r.items.reduce((sum, i) => sum + (i.name.length > 24 ? 26 : 13), 20) : 0) +
    totalsRowCount * 13 +
    40; // footer

  const doc = new PDFDocument({
    size: [width, Math.max(200, estimatedHeight)],
    margins: { top: 20, bottom: 20, left: marginX, right: marginX },
  });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const center = (text: string, size: number, bold = false) => {
    doc.font(bold ? "Courier-Bold" : "Courier").fontSize(size).text(text, marginX, doc.y, { width: width - marginX * 2, align: "center" });
  };
  const dashedLine = () => {
    doc.moveTo(marginX, doc.y).dash(2, { space: 2 }).lineTo(width - marginX, doc.y).stroke();
    doc.undash();
    doc.moveDown(0.4);
  };
  const row = (label: string, value: string, bold = false) => {
    doc.font(bold ? "Courier-Bold" : "Courier").fontSize(bold ? 11 : 9);
    const y = doc.y;
    doc.text(label, marginX, y);
    doc.text(value, marginX, y, { width: width - marginX * 2, align: "right" });
    doc.moveDown(0.3);
  };

  center(r.restaurantName, 13, true);
  doc.moveDown(0.3);
  if (r.fssai) {
    center(`FSSAI Lic. No. ${r.fssai}`, 9);
    doc.moveDown(0.2);
  }
  center(`Invoice ${r.invoiceNumber}${r.orderNumber ? ` · ${r.orderNumber}` : ""}`, 9);
  doc.moveDown(0.2);
  if (r.customer) {
    center(r.customer, 9);
    doc.moveDown(0.2);
  }
  center(new Date().toLocaleString(), 9);
  doc.moveDown(0.5);
  dashedLine();

  if (r.items.length) {
    doc.font("Courier").fontSize(9);
    for (const item of r.items) {
      const y = doc.y;
      doc.text(`${item.qty}x`, marginX, y, { width: 24 });
      doc.text(item.name, marginX + 24, y, { width: width - marginX * 2 - 24 });
      doc.moveDown(0.3);
    }
    dashedLine();
  }

  if (r.subtotal != null) row("Subtotal", formatCurrency(r.subtotal));
  if (r.discountAmount) row("Discount", `-${formatCurrency(r.discountAmount)}`);
  if (r.serviceChargeAmount) row("Service Charge", formatCurrency(r.serviceChargeAmount));
  if (r.taxAmount != null) row("Tax", formatCurrency(r.taxAmount));
  doc.moveDown(0.2);
  row("Total", formatCurrency(r.total), true);
  if (r.method) row("Paid via", r.method.toUpperCase());

  doc.moveDown(0.5);
  center("Thank you for visiting!", 9);

  doc.end();
  return done;
}
