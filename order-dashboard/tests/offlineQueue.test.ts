import { describe, it, expect, beforeEach } from "vitest";
import { getQueuedOrders, enqueueOrder, removeQueuedOrder, queuedOrderCount, isNetworkError } from "../lib/offlineQueue";

beforeEach(() => {
  localStorage.clear();
});

describe("offline order queue", () => {
  it("is empty with nothing stored", () => {
    expect(getQueuedOrders()).toEqual([]);
    expect(queuedOrderCount()).toBe(0);
  });

  it("returns an empty array for corrupted JSON instead of throwing", () => {
    localStorage.setItem("order-dashboard-offline-order-queue", "{not json");
    expect(getQueuedOrders()).toEqual([]);
  });

  it("enqueues an order with a generated id and timestamp", () => {
    const entry = enqueueOrder({ items: [{ name: "Cheese Burger", qty: 1 }] });
    expect(entry.id).toMatch(/^offline-/);
    expect(entry.queuedAt).toBeTruthy();
    expect(queuedOrderCount()).toBe(1);
  });

  it("keeps queue order across multiple enqueues", () => {
    enqueueOrder({ items: [{ name: "A", qty: 1 }] });
    enqueueOrder({ items: [{ name: "B", qty: 1 }] });
    const queue = getQueuedOrders();
    expect(queue).toHaveLength(2);
    expect((queue[0].payload as any).items[0].name).toBe("A");
    expect((queue[1].payload as any).items[0].name).toBe("B");
  });

  it("removes a queued order by id", () => {
    const entry = enqueueOrder({ items: [] });
    enqueueOrder({ items: [] });
    removeQueuedOrder(entry.id);
    expect(queuedOrderCount()).toBe(1);
    expect(getQueuedOrders().some((e) => e.id === entry.id)).toBe(false);
  });
});

describe("isNetworkError", () => {
  it("treats a TypeError as a network failure", () => {
    expect(isNetworkError(new TypeError("Failed to fetch"))).toBe(true);
  });

  it("does not treat a regular Error (server response) as a network failure", () => {
    expect(isNetworkError(new Error("Invalid input"))).toBe(false);
  });
});
