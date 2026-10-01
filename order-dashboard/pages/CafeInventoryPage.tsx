import { useEffect, useState } from "react";
import {
  PackageAdd01Icon,
  PackageRemove01Icon,
  SlidersHorizontalIcon,
  Recycle01Icon,
  Alert02Icon,
  PlusSignIcon,
  Cancel01Icon,
  PackageIcon,
  StarIcon,
  Search01Icon,
  ToggleOnIcon,
  ToggleOffIcon,
} from "hugeicons-react";
import { getIngredients, recordStockMovement, getStockLog, createIngredient, updateIngredient } from "../lib/api";

const MOVEMENT_TYPES = [
  { key: "in", label: "Stock In", icon: PackageAdd01Icon },
  { key: "out", label: "Stock Out", icon: PackageRemove01Icon },
  { key: "adjustment", label: "Adjustment", icon: SlidersHorizontalIcon },
  { key: "wastage", label: "Wastage", icon: Recycle01Icon },
];

const STATUS_STYLE = {
  ok: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  low: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  out: "bg-red-500/10 text-red-600 dark:text-red-400",
};

const STATUS_LABEL = { ok: "In Stock", low: "Low Stock", out: "Out of Stock" };

function formatTime(iso) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function CafeInventoryPage() {
  const [ingredients, setIngredients] = useState([]);
  const [log, setLog] = useState([]);
  const [moving, setMoving] = useState(null); // { ingredient, type }
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [newIngredient, setNewIngredient] = useState({ name: "", unit: "kg", stock: "", minimum: "", category: "" });

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  async function refresh() {
    setIngredients(await getIngredients());
    setLog(await getStockLog());
  }

  useEffect(() => {
    refresh();
  }, []);

  function openMovement(ingredient, type) {
    setMoving({ ingredient, type });
    setQty("");
    setNote("");
  }

  async function submitMovement() {
    if (!moving || qty === "") return;
    await recordStockMovement(moving.ingredient._id, { type: moving.type, qty, note });
    setMoving(null);
    refresh();
  }

  async function handleAddIngredient() {
    if (!newIngredient.name.trim()) return;
    await createIngredient({
      name: newIngredient.name.trim(),
      unit: newIngredient.unit,
      stock: Number(newIngredient.stock) || 0,
      minimum: Number(newIngredient.minimum) || 0,
      category: newIngredient.category.trim(),
    });
    setNewIngredient({ name: "", unit: "kg", stock: "", minimum: "", category: "" });
    setShowAdd(false);
    refresh();
  }

  async function toggleFavourite(ing) {
    await updateIngredient(ing._id, { favourite: !ing.favourite });
    refresh();
  }

  async function toggleActive(ing) {
    await updateIngredient(ing._id, { active: !ing.active });
    refresh();
  }

  const lowCount = ingredients.filter((i) => i.status === "low").length;
  const outCount = ingredients.filter((i) => i.status === "out").length;

  const categories = Array.from(new Set(ingredients.map((i) => i.category).filter(Boolean))).sort();

  const visibleIngredients = ingredients.filter((i) => {
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter !== "all" && i.category !== categoryFilter) return false;
    return true;
  });

  // Simple reorder heuristic: top the stock back up to 2x the minimum
  // threshold. No supplier integration — this is just a suggestion list
  // for staff to act on manually.
  const reorderSuggestions = ingredients
    .filter((i) => i.status !== "ok" && i.minimum > 0)
    .map((i) => ({ ...i, suggestedQty: Math.max(i.minimum, i.minimum * 2 - i.stock) }))
    .sort((a, b) => (a.status === "out" ? -1 : 1) - (b.status === "out" ? -1 : 1));

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold">
              <PackageIcon size={20} strokeWidth={1.8} />
              Inventory
            </h1>
            <p className="mt-1 text-sm text-(--color-text-muted)">Ingredient stock levels and movements.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 rounded-md bg-(--color-accent) px-3 py-1.5 text-sm font-medium text-white"
          >
            <PlusSignIcon size={14} strokeWidth={1.8} />
            Add Ingredient
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4 sm:max-w-md">
          <div className="rounded-xl border border-(--color-border) p-3">
            <div className="text-xl font-semibold tabular-nums">{ingredients.length}</div>
            <div className="text-xs text-(--color-text-muted)">Ingredients</div>
          </div>
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3">
            <div className="text-xl font-semibold tabular-nums text-amber-600 dark:text-amber-400">{lowCount}</div>
            <div className="text-xs text-(--color-text-muted)">Low Stock</div>
          </div>
          <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-3">
            <div className="text-xl font-semibold tabular-nums text-red-500">{outCount}</div>
            <div className="text-xs text-(--color-text-muted)">Out of Stock</div>
          </div>
        </div>

        {reorderSuggestions.length > 0 && (
          <div className="mt-5 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
            <h2 className="flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400">
              <Alert02Icon size={14} strokeWidth={1.8} />
              Reorder Suggestions
            </h2>
            <div className="mt-2 flex flex-col gap-1.5">
              {reorderSuggestions.map((s) => (
                <div key={s._id} className="flex items-center justify-between text-sm">
                  <span>{s.name}</span>
                  <span className="text-xs text-(--color-text-muted)">
                    {s.stock} {s.unit} left — suggested reorder{" "}
                    <span className="font-medium text-(--color-text)">
                      {s.suggestedQty} {s.unit}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search01Icon size={14} strokeWidth={1.8} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-(--color-text-muted)" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ingredients"
              className="w-full rounded-md border border-(--color-border) bg-transparent py-1.5 pl-8 pr-2 text-sm outline-none focus:border-(--color-accent)"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-md border border-(--color-border) bg-transparent px-2 py-1.5 text-sm outline-none focus:border-(--color-accent)"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 overflow-x-auto rounded-xl border border-(--color-border)">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-(--color-border) text-xs text-(--color-text-muted)">
                <th className="px-3 py-2 font-medium">Ingredient</th>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 font-medium">Stock</th>
                <th className="px-3 py-2 font-medium">Minimum</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Favourite</th>
                <th className="px-3 py-2 font-medium">Active</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleIngredients.map((ing) => (
                <tr key={ing._id} className={`border-b border-(--color-border) last:border-0 ${!ing.active ? "opacity-50" : ""}`}>
                  <td className="px-3 py-2 font-medium">{ing.name}</td>
                  <td className="px-3 py-2 text-(--color-text-muted)">{ing.category || "-"}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {ing.stock} {ing.unit}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-(--color-text-muted)">
                    {ing.minimum} {ing.unit}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[ing.status]}`}>
                      {ing.status !== "ok" && <Alert02Icon size={11} strokeWidth={1.8} />}
                      {STATUS_LABEL[ing.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => toggleFavourite(ing)}
                      title={ing.favourite ? "Remove favourite" : "Set as favourite"}
                      className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${ing.favourite ? "text-amber-500" : "text-(--color-text-muted) hover:text-(--color-text)"}`}
                    >
                      <StarIcon size={15} strokeWidth={1.8} fill={ing.favourite ? "currentColor" : "none"} />
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => toggleActive(ing)}
                      title={ing.active ? "Deactivate" : "Activate"}
                      className={ing.active ? "text-emerald-600 dark:text-emerald-400" : "text-(--color-text-muted)"}
                    >
                      {ing.active ? <ToggleOnIcon size={22} strokeWidth={1.8} /> : <ToggleOffIcon size={22} strokeWidth={1.8} />}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      {MOVEMENT_TYPES.map(({ key, label, icon: Icon }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => openMovement(ing, key)}
                          title={label}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-(--color-border) text-(--color-text-muted) transition-colors hover:bg-black/5 hover:text-(--color-text) dark:hover:bg-white/10"
                        >
                          <Icon size={13} strokeWidth={1.8} />
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {visibleIngredients.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-sm text-(--color-text-muted)">
                    No ingredients found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="w-80 shrink-0 overflow-y-auto border-l border-(--color-border) p-5">
        <h2 className="text-sm font-medium text-(--color-text-muted)">Recent Movements</h2>
        <div className="mt-3 flex flex-col gap-2">
          {log.map((entry) => (
            <div key={entry._id} className="rounded-md border border-(--color-border) p-2.5 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">{entry.ingredientName}</span>
                <span className="capitalize text-(--color-text-muted)">{entry.type}</span>
              </div>
              <div className="mt-0.5 flex justify-between text-xs text-(--color-text-muted)">
                <span>{entry.note || "-"}</span>
                <span>{entry.qty}</span>
              </div>
              <div className="mt-0.5 text-[11px] text-(--color-text-muted)">{formatTime(entry.createdAt)}</div>
            </div>
          ))}
          {log.length === 0 && <div className="text-xs text-(--color-text-muted)">No movements yet.</div>}
        </div>
      </div>

      {moving && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/30 p-4" onClick={() => setMoving(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl border border-(--color-border) bg-(--color-canvas) p-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                {MOVEMENT_TYPES.find((m) => m.key === moving.type).label} — {moving.ingredient.name}
              </h2>
              <button
                type="button"
                onClick={() => setMoving(null)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-(--color-text-muted) transition-colors hover:bg-black/5 hover:text-(--color-text) dark:hover:bg-white/10"
              >
                <Cancel01Icon size={16} strokeWidth={1.8} />
              </button>
            </div>
            <label className="mt-4 block text-xs text-(--color-text-muted)">
              {moving.type === "adjustment" ? `New stock (${moving.ingredient.unit})` : `Quantity (${moving.ingredient.unit})`}
            </label>
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="mt-1 w-full rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
            />
            <label className="mt-3 block text-xs text-(--color-text-muted)">Note (optional)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 w-full rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
            />
            <button
              type="button"
              onClick={submitMovement}
              className="mt-4 w-full rounded-md bg-(--color-accent) py-2 text-sm font-medium text-white"
            >
              Confirm
            </button>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/30 p-4" onClick={() => setShowAdd(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl border border-(--color-border) bg-(--color-canvas) p-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Add Ingredient</h2>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-(--color-text-muted) transition-colors hover:bg-black/5 hover:text-(--color-text) dark:hover:bg-white/10"
              >
                <Cancel01Icon size={16} strokeWidth={1.8} />
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <input
                value={newIngredient.name}
                onChange={(e) => setNewIngredient((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ingredient name"
                className="rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
              />
              <div className="flex gap-2">
                <input
                  value={newIngredient.unit}
                  onChange={(e) => setNewIngredient((f) => ({ ...f, unit: e.target.value }))}
                  placeholder="Unit (kg, ltr, pcs)"
                  className="flex-1 rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
                />
                <input
                  value={newIngredient.category}
                  onChange={(e) => setNewIngredient((f) => ({ ...f, category: e.target.value }))}
                  placeholder="Category"
                  className="flex-1 rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={newIngredient.stock}
                  onChange={(e) => setNewIngredient((f) => ({ ...f, stock: e.target.value }))}
                  placeholder="Starting stock"
                  className="flex-1 rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
                />
                <input
                  type="number"
                  value={newIngredient.minimum}
                  onChange={(e) => setNewIngredient((f) => ({ ...f, minimum: e.target.value }))}
                  placeholder="Minimum"
                  className="flex-1 rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddIngredient}
              className="mt-4 w-full rounded-md bg-(--color-accent) py-2 text-sm font-medium text-white"
            >
              Add Ingredient
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
