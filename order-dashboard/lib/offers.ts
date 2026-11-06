// Pure cart-analysis helpers for the "Offers & Combos" engine. Kept free of
// React/UI so the money math is unit-testable on its own — this runs
// against a live cafe's real bills, so every rupee here needs a test.

export interface OfferCartLine {
  itemId: string;
  category?: string;
  unitPrice: number;
  qty: number;
  addons?: { price: number }[];
  isFreeOffer?: boolean;
}

export interface Offer {
  _id: string;
  name: string;
  type: "bogo" | "threshold_freebie" | "combo";
  active: boolean;
  triggerCategory?: string | null;
  triggerItemId?: string | null;
  minTriggerPrice?: number | null;
  buyQty?: number | null;
  freeQty?: number | null;
  freeItemId?: string | null;
  comboItemIds?: string[];
  comboPrice?: number | null;
}

export function lineUnitPrice(line: OfferCartLine) {
  return line.unitPrice + (line.addons ?? []).reduce((s, a) => s + a.price, 0);
}

function matchesTrigger(line: OfferCartLine, offer: Offer) {
  if (line.isFreeOffer) return false; // a free line from one offer never triggers another
  if (offer.triggerItemId) return line.itemId === offer.triggerItemId;
  if (offer.triggerCategory) {
    if (line.category !== offer.triggerCategory) return false;
    if (offer.minTriggerPrice != null) return lineUnitPrice(line) >= offer.minTriggerPrice;
    return true;
  }
  return false;
}

export interface EligibleDiscount {
  offer: Offer;
  discountAmount: number;
  description: string;
}

// bogo + combo are pure billing adjustments — the kitchen prepares every
// line exactly as ordered either way, so these never touch the cart itself.
export function detectEligibleDiscounts(cart: OfferCartLine[], offers: Offer[]): EligibleDiscount[] {
  const results: EligibleDiscount[] = [];

  for (const offer of offers) {
    if (!offer.active) continue;

    if (offer.type === "bogo") {
      const matching = cart.filter((l) => matchesTrigger(l, offer));
      const totalQty = matching.reduce((s, l) => s + l.qty, 0);
      if (!offer.buyQty || !offer.freeQty || totalQty < offer.buyQty) continue;

      // "Buy X Get Y Free" consumes (X + Y) units per cycle, Y of them free —
      // buyQty alone is the PAID count, not the whole bundle, so e.g. "buy 1
      // get 1 free" with 2 items in cart makes exactly 1 free, not both.
      const cycle = offer.buyQty + offer.freeQty;
      const fullCycles = Math.floor(totalQty / cycle);
      const remainder = totalQty % cycle;
      const freeUnits = fullCycles * offer.freeQty + Math.max(0, remainder - offer.buyQty);
      if (freeUnits <= 0) continue;

      const unitPrices: number[] = [];
      for (const l of matching) {
        for (let i = 0; i < l.qty; i++) unitPrices.push(lineUnitPrice(l));
      }
      unitPrices.sort((a, b) => a - b);

      const freeCount = Math.min(freeUnits, unitPrices.length);
      const discountAmount = unitPrices.slice(0, freeCount).reduce((s, p) => s + p, 0);
      if (discountAmount > 0) {
        results.push({ offer, discountAmount, description: `${offer.name} (${freeCount} free)` });
      }
    }

    if (offer.type === "combo") {
      const ids = offer.comboItemIds ?? [];
      if (ids.length < 2 || offer.comboPrice == null) continue;

      const qtyOf = (id: string) => cart.filter((l) => l.itemId === id && !l.isFreeOffer).reduce((s, l) => s + l.qty, 0);
      const priceOf = (id: string) => {
        const line = cart.find((l) => l.itemId === id && !l.isFreeOffer);
        return line ? lineUnitPrice(line) : 0;
      };

      const sets = Math.min(...ids.map(qtyOf));
      if (sets <= 0) continue;

      const individualTotal = ids.reduce((s, id) => s + priceOf(id), 0) * sets;
      const comboTotal = offer.comboPrice * sets;
      const discountAmount = Math.max(0, individualTotal - comboTotal);
      if (discountAmount > 0) {
        results.push({ offer, discountAmount, description: sets > 1 ? `${offer.name} ×${sets}` : offer.name });
      }
    }
  }

  return results;
}

// threshold_freebie needs an actual KOT line (the kitchen has to make the
// free item), so it's surfaced as a suggestion for staff to add with one
// click rather than auto-applied like the two billing-only types above.
export function detectFreebieSuggestions(cart: OfferCartLine[], offers: Offer[]) {
  return offers.filter((offer) => offer.active && offer.type === "threshold_freebie" && cart.some((l) => matchesTrigger(l, offer)));
}
