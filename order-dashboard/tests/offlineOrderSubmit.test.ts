import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { submitOrder, flushOfflineQueue } from "../lib/api";
import { queuedOrderCount } from "../lib/offlineQueue";

const baseOrder = {
  orderType: "dine-in",
  items: [{ itemId: "m1", name: "Cheese Burger", qty: 1, unitPrice: 179, addons: [] }],
  total: 179,
  action: "save",
};

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("submitOrder offline handling", () => {
  it("returns the created order as normal when the network is up", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        text: async () => JSON.stringify({ id: "o1", orderNumber: "ORD-3001", orderType: "dine_in", items: [], amount: 179 }),
      })
    );

    const result = await submitOrder(baseOrder);
    expect(result.orderNumber).toBe("ORD-3001");
    expect(queuedOrderCount()).toBe(0);
  });

  it("queues the order locally when fetch throws a network error, instead of losing it", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const result: any = await submitOrder(baseOrder);
    expect(result._offline).toBe(true);
    expect(result.orderNumber).toMatch(/queued/i);
    expect(queuedOrderCount()).toBe(1);
  });

  it("does not queue a real server-side rejection (e.g. validation error)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 400, text: async () => JSON.stringify({ error: "Invalid input" }) })
    );

    await expect(submitOrder(baseOrder)).rejects.toThrow("Invalid input");
    expect(queuedOrderCount()).toBe(0);
  });
});

describe("flushOfflineQueue", () => {
  it("replays queued orders and clears them once the network is back", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await submitOrder(baseOrder);
    await submitOrder(baseOrder);
    expect(queuedOrderCount()).toBe(2);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        text: async () => JSON.stringify({ id: "o2", orderNumber: "ORD-3002", items: [] }),
      })
    );

    const result = await flushOfflineQueue();
    expect(result.synced).toBe(2);
    expect(result.remaining).toBe(0);
    expect(queuedOrderCount()).toBe(0);
  });

  it("stops at the first still-failing order and leaves the rest queued", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await submitOrder(baseOrder);
    await submitOrder(baseOrder);

    // Still offline — flush should sync nothing and leave both queued.
    const result = await flushOfflineQueue();
    expect(result.synced).toBe(0);
    expect(result.remaining).toBe(2);
  });
});
