// Orders placed while the connection is down are queued here (localStorage,
// same pattern as the auth session/outlet preference) instead of being
// lost. They get replayed against the real API once connectivity returns.

const QUEUE_KEY = "order-dashboard-offline-order-queue";

export interface QueuedOrder {
  id: string;
  payload: unknown;
  queuedAt: string;
}

export function getQueuedOrders(): QueuedOrder[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedOrder[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function enqueueOrder(payload: unknown): QueuedOrder {
  const entry: QueuedOrder = {
    id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    payload,
    queuedAt: new Date().toISOString(),
  };
  saveQueue([...getQueuedOrders(), entry]);
  return entry;
}

export function removeQueuedOrder(id: string) {
  saveQueue(getQueuedOrders().filter((e) => e.id !== id));
}

export function queuedOrderCount() {
  return getQueuedOrders().length;
}

// A fetch() TypeError ("Failed to fetch" / "NetworkError") means the
// request never reached the server — the connection is down. A response
// that came back with a non-2xx status (our request() helper throws a
// plain Error with the server's message for that) is a real failure and
// should surface normally instead of being silently queued.
export function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError;
}
