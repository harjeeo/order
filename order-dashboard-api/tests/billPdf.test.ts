import { buildBillPdf } from "../src/lib/billPdf";

describe("bill PDF generation", () => {
  it("produces a valid PDF buffer sized to the content, not a fixed oversized page", async () => {
    const short = await buildBillPdf({
      restaurantName: "Short Cafe",
      invoiceNumber: "INV-1",
      items: [{ name: "Tea", qty: 1 }],
      total: 20,
    });
    const long = await buildBillPdf({
      restaurantName: "Tanvir's Cafe",
      fssai: "12345678901234",
      invoiceNumber: "INV-5001",
      orderNumber: "ORD-3001",
      customer: "Rahul Sharma",
      items: [
        { name: "Cold Coffee", qty: 2 },
        { name: "Cheese Burger (Double) (+Extra Cheese)", qty: 1 },
      ],
      subtotal: 450,
      taxAmount: 22,
      total: 472,
      method: "cash",
    });

    expect(short.subarray(0, 5).toString()).toBe("%PDF-");
    expect(long.subarray(0, 5).toString()).toBe("%PDF-");

    // A bill with more items/fields should produce a taller (bigger) page
    // than a one-line bill — confirms the page height is derived from
    // content rather than a single fixed size for every bill.
    const mediaBoxHeight = (buf: Buffer) => {
      const match = buf.toString("latin1").match(/\/MediaBox \[0 0 \d+ (\d+)\]/);
      return match ? Number(match[1]) : 0;
    };
    expect(mediaBoxHeight(long)).toBeGreaterThan(mediaBoxHeight(short));
  });
});
