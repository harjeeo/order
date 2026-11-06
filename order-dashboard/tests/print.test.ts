import { describe, it, expect } from "vitest";
import { buildInvoiceHtml } from "../lib/print";

const base = {
  invoiceNumber: "INV-1",
  subtotal: 1850,
  taxAmount: 88.1,
  total: 1938.1,
};

describe("buildInvoiceHtml — tax breakdown", () => {
  it("splits CGST + SGST when both are configured", () => {
    const html = buildInvoiceHtml({ ...base, cgstPercent: 2.5, sgstPercent: 2.5 });
    expect(html).toContain("CGST @ 2.5%");
    expect(html).toContain("SGST @ 2.5%");
    expect(html).not.toContain("<td>Tax</td>");
  });

  it("splits the tax amount roughly in half between CGST and SGST", () => {
    const html = buildInvoiceHtml({ ...base, taxAmount: 100, cgstPercent: 2.5, sgstPercent: 2.5 });
    expect(html).toMatch(/CGST @ 2\.5%<\/td><td class="right">Rs\. 50/);
    expect(html).toMatch(/SGST @ 2\.5%<\/td><td class="right">Rs\. 50/);
  });

  it("shows a single IGST line when only IGST is configured", () => {
    const html = buildInvoiceHtml({ ...base, igstPercent: 5 });
    expect(html).toContain("IGST @ 5%");
    expect(html).not.toContain("CGST");
    expect(html).not.toContain("SGST");
  });

  it("prefers CGST+SGST over IGST when both happen to be set", () => {
    const html = buildInvoiceHtml({ ...base, cgstPercent: 2.5, sgstPercent: 2.5, igstPercent: 5 });
    expect(html).toContain("CGST @ 2.5%");
    expect(html).toContain("SGST @ 2.5%");
    expect(html).not.toContain("IGST");
  });

  it("falls back to a plain Tax line when no GST rate is configured", () => {
    const html = buildInvoiceHtml(base);
    expect(html).toContain("<td>Tax</td>");
  });

  it("shows no tax line at all when tax is zero", () => {
    const html = buildInvoiceHtml({ ...base, taxAmount: 0, cgstPercent: 2.5, sgstPercent: 2.5 });
    expect(html).not.toContain("CGST");
    expect(html).not.toContain("SGST");
    expect(html).not.toContain("<td>Tax</td>");
  });

  it("skips the SGST line if only CGST has a nonzero rate", () => {
    const html = buildInvoiceHtml({ ...base, cgstPercent: 5, sgstPercent: 0 });
    expect(html).toContain("CGST @ 5%");
    expect(html).not.toContain("SGST");
  });
});
