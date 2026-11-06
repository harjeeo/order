import { describe, it, expect } from "vitest";
import { detectEligibleDiscounts, detectFreebieSuggestions, lineUnitPrice, type Offer, type OfferCartLine } from "../lib/offers";

function line(overrides: Partial<OfferCartLine> & { itemId: string; unitPrice: number; qty: number }): OfferCartLine {
  return { addons: [], ...overrides };
}

const bogoPizza: Offer = {
  _id: "o1",
  name: "Buy 1 Pizza Get 1 Free",
  type: "bogo",
  active: true,
  triggerCategory: "Pizza",
  buyQty: 1,
  freeQty: 1,
};

const comboOffer: Offer = {
  _id: "o2",
  name: "Sandwich + Garlic Bread Combo",
  type: "combo",
  active: true,
  comboItemIds: ["sandwich", "garlic-bread"],
  comboPrice: 190,
};

const freebieOffer: Offer = {
  _id: "o3",
  name: "Burger -> Free Fries",
  type: "threshold_freebie",
  active: true,
  triggerItemId: "makhni-burger",
  freeItemId: "fries",
};

describe("lineUnitPrice", () => {
  it("adds addon prices to the base unit price", () => {
    const l = line({ itemId: "x", unitPrice: 100, qty: 1, addons: [{ price: 20 }, { price: 10 }] });
    expect(lineUnitPrice(l)).toBe(130);
  });
});

describe("detectEligibleDiscounts — bogo", () => {
  it("does nothing below the buy threshold", () => {
    const cart = [line({ itemId: "p1", category: "Pizza", unitPrice: 200, qty: 1 })];
    // buyQty 2 for this test
    const offer = { ...bogoPizza, buyQty: 2 };
    expect(detectEligibleDiscounts(cart, [offer])).toEqual([]);
  });

  it("buy 1 get 1 free: discounts the cheaper of two pizzas", () => {
    const cart = [
      line({ itemId: "p1", category: "Pizza", unitPrice: 200, qty: 1 }),
      line({ itemId: "p2", category: "Pizza", unitPrice: 150, qty: 1 }),
    ];
    const [result] = detectEligibleDiscounts(cart, [bogoPizza]);
    expect(result.discountAmount).toBe(150);
    expect(result.offer._id).toBe("o1");
  });

  it("buy 2 get 1 free, with qty expressed on a single line", () => {
    const cart = [line({ itemId: "p1", category: "Pizza", unitPrice: 180, qty: 3 })];
    const offer = { ...bogoPizza, buyQty: 2, freeQty: 1 };
    // 3 units -> floor(3/2)*1 = 1 free unit
    const [result] = detectEligibleDiscounts(cart, [offer]);
    expect(result.discountAmount).toBe(180);
  });

  it("repeats the offer for every full (buy + free) cycle", () => {
    // Buy 2 get 1 free: each full cycle uses 3 units (2 paid + 1 free).
    const offer = { ...bogoPizza, buyQty: 2, freeQty: 1 };

    // 4 units = 1 full cycle (3) + 1 leftover, not enough to start another —
    // only the one cycle's free unit applies.
    const partial = [line({ itemId: "p1", category: "Pizza", unitPrice: 100, qty: 4 })];
    expect(detectEligibleDiscounts(partial, [offer])[0].discountAmount).toBe(100);

    // 6 units = exactly 2 full cycles -> 2 free units.
    const twoCycles = [line({ itemId: "p1", category: "Pizza", unitPrice: 100, qty: 6 })];
    expect(detectEligibleDiscounts(twoCycles, [offer])[0].discountAmount).toBe(200);
  });

  it("only matches a specific item when triggerItemId is set instead of a category", () => {
    const specific: Offer = { ...bogoPizza, triggerCategory: null, triggerItemId: "margherita" };
    const cart = [
      line({ itemId: "margherita", category: "Pizza", unitPrice: 200, qty: 2 }),
      line({ itemId: "pepperoni", category: "Pizza", unitPrice: 50, qty: 1 }), // cheaper, but wrong item — ignored
    ];
    const [result] = detectEligibleDiscounts(cart, [specific]);
    // 2 qualifying margherita units -> 1 free; the cheaper pepperoni never counts.
    expect(result.discountAmount).toBe(200);
  });

  it("does nothing when only one qualifying unit is in the cart (nothing to give free)", () => {
    const cart = [line({ itemId: "p1", category: "Pizza", unitPrice: 200, qty: 1 })];
    expect(detectEligibleDiscounts(cart, [bogoPizza])).toEqual([]);
  });

  it("ignores an inactive offer entirely", () => {
    const cart = [
      line({ itemId: "p1", category: "Pizza", unitPrice: 200, qty: 1 }),
      line({ itemId: "p2", category: "Pizza", unitPrice: 150, qty: 1 }),
    ];
    expect(detectEligibleDiscounts(cart, [{ ...bogoPizza, active: false }])).toEqual([]);
  });

  it("never discounts a line that is itself a free-offer line", () => {
    const cart = [
      line({ itemId: "p1", category: "Pizza", unitPrice: 200, qty: 1, isFreeOffer: true }),
      line({ itemId: "p2", category: "Pizza", unitPrice: 150, qty: 1, isFreeOffer: true }),
    ];
    expect(detectEligibleDiscounts(cart, [bogoPizza])).toEqual([]);
  });
});

describe("detectEligibleDiscounts — combo", () => {
  it("discounts the gap between individual prices and the combo price", () => {
    const cart = [
      line({ itemId: "sandwich", unitPrice: 110, qty: 1 }),
      line({ itemId: "garlic-bread", unitPrice: 130, qty: 1 }),
    ];
    // 110 + 130 = 240, combo = 190 -> discount 50
    const [result] = detectEligibleDiscounts(cart, [comboOffer]);
    expect(result.discountAmount).toBe(50);
  });

  it("applies once per complete set when quantities allow more than one", () => {
    const cart = [
      line({ itemId: "sandwich", unitPrice: 110, qty: 2 }),
      line({ itemId: "garlic-bread", unitPrice: 130, qty: 2 }),
    ];
    const [result] = detectEligibleDiscounts(cart, [comboOffer]);
    expect(result.discountAmount).toBe(100); // 2 sets * 50 each
    expect(result.description).toContain("×2");
  });

  it("does not apply if only one of the two combo items is in the cart", () => {
    const cart = [line({ itemId: "sandwich", unitPrice: 110, qty: 1 })];
    expect(detectEligibleDiscounts(cart, [comboOffer])).toEqual([]);
  });

  it("does not apply (and never goes negative) if the combo is somehow pricier than the items", () => {
    const cheapCombo: Offer = { ...comboOffer, comboPrice: 500 };
    const cart = [
      line({ itemId: "sandwich", unitPrice: 110, qty: 1 }),
      line({ itemId: "garlic-bread", unitPrice: 130, qty: 1 }),
    ];
    expect(detectEligibleDiscounts(cart, [cheapCombo])).toEqual([]);
  });

  it("limited by the scarcer item when quantities are mismatched", () => {
    const cart = [
      line({ itemId: "sandwich", unitPrice: 110, qty: 3 }),
      line({ itemId: "garlic-bread", unitPrice: 130, qty: 1 }),
    ];
    // Only 1 complete set possible (garlic-bread is the bottleneck).
    const [result] = detectEligibleDiscounts(cart, [comboOffer]);
    expect(result.discountAmount).toBe(50);
    expect(result.description).not.toContain("×");
  });
});

describe("detectFreebieSuggestions", () => {
  it("suggests the free item once the trigger item is in the cart", () => {
    const cart = [line({ itemId: "makhni-burger", unitPrice: 150, qty: 1 })];
    expect(detectFreebieSuggestions(cart, [freebieOffer])).toEqual([freebieOffer]);
  });

  it("suggests nothing when the trigger item is absent", () => {
    const cart = [line({ itemId: "cappuccino", unitPrice: 110, qty: 1 })];
    expect(detectFreebieSuggestions(cart, [freebieOffer])).toEqual([]);
  });

  it("respects a minimum trigger price on a category-based freebie", () => {
    const categoryFreebie: Offer = { ...freebieOffer, triggerItemId: null, triggerCategory: "Burger", minTriggerPrice: 140 };
    const tooCheap = [line({ itemId: "aloo-tikki", category: "Burger", unitPrice: 35, qty: 1 })];
    const justRight = [line({ itemId: "makhni-burger", category: "Burger", unitPrice: 150, qty: 1 })];
    expect(detectFreebieSuggestions(tooCheap, [categoryFreebie])).toEqual([]);
    expect(detectFreebieSuggestions(justRight, [categoryFreebie])).toEqual([categoryFreebie]);
  });

  it("ignores an inactive freebie offer", () => {
    const cart = [line({ itemId: "makhni-burger", unitPrice: 150, qty: 1 })];
    expect(detectFreebieSuggestions(cart, [{ ...freebieOffer, active: false }])).toEqual([]);
  });
});
