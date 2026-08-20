import { useEffect, useState } from "react";
import { ChefHatIcon, PlusSignIcon, Delete02Icon, CheckmarkCircle02Icon } from "hugeicons-react";
import { getMenuItems, getIngredients, getRecipe, saveRecipe } from "../lib/api";

function emptyRow() {
  return { ingredientId: "", qty: "" };
}

export default function CafeRecipesPage() {
  const [items, setItems] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [rows, setRows] = useState([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getMenuItems().then(setItems);
    getIngredients().then(setIngredients);
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setRows([]);
      return;
    }
    setError("");
    getRecipe(selectedId).then((recipe) => {
      setRows(recipe.length > 0 ? recipe.map((r) => ({ ingredientId: r.ingredientId, qty: String(r.qty) })) : [emptyRow()]);
    });
  }, [selectedId]);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(t);
  }, [saved]);

  function updateRow(index, field, value) {
    setRows((rs) => rs.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    setRows((rs) => [...rs, emptyRow()]);
  }

  function removeRow(index) {
    setRows((rs) => rs.filter((_, i) => i !== index));
  }

  function ingredientUnit(ingredientId) {
    return ingredients.find((i) => i._id === ingredientId)?.unit ?? "";
  }

  async function handleSave() {
    const valid = rows.filter((r) => r.ingredientId && Number(r.qty) > 0);
    if (valid.length === 0) {
      setError("Add at least one ingredient with a quantity.");
      return;
    }
    setError("");
    try {
      await saveRecipe(
        selectedId,
        valid.map((r) => ({ ingredientId: r.ingredientId, qty: Number(r.qty) }))
      );
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save recipe");
    }
  }

  const selectedItem = items.find((i) => i._id === selectedId);

  return (
    <div className="flex h-full">
      <div className="w-64 shrink-0 overflow-y-auto border-r border-(--color-border) px-3 py-6">
        <h1 className="px-2 text-lg font-semibold">Recipes</h1>
        <p className="px-2 pb-3 text-xs text-(--color-text-muted)">Pick a menu item to link its ingredients.</p>
        <div className="flex flex-col gap-0.5">
          {items.map((item) => (
            <button
              key={item._id}
              type="button"
              onClick={() => setSelectedId(item._id)}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                selectedId === item._id
                  ? "bg-black/5 font-medium text-(--color-text) dark:bg-white/10"
                  : "text-(--color-text-muted) hover:bg-black/5 dark:hover:bg-white/10"
              }`}
            >
              <span>{item.image && !item.image.startsWith("data:image") ? item.image : "🍽️"}</span>
              {item.name}
            </button>
          ))}
          {items.length === 0 && <div className="px-2 text-xs text-(--color-text-muted)">No menu items yet.</div>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {!selectedId && (
          <div className="flex h-full flex-col items-center justify-center px-10 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-(--color-accent)/10 text-(--color-accent)">
              <ChefHatIcon size={30} strokeWidth={1.8} />
            </div>
            <h2 className="mb-2 text-lg font-semibold">No item selected</h2>
            <p className="max-w-sm text-sm text-(--color-text-muted)">
              Select a menu item on the left to link ingredients and quantities. Stock is deducted automatically whenever an
              order with that item is placed.
            </p>
          </div>
        )}

        {selectedId && (
          <div className="max-w-xl">
            <h2 className="text-lg font-semibold">{selectedItem?.name}</h2>
            <p className="mt-1 text-sm text-(--color-text-muted)">
              Ingredients consumed per 1 unit of this item.
            </p>

            <div className="mt-4 flex flex-col gap-2">
              {rows.map((row, index) => (
                <div key={index} className="flex items-center gap-2">
                  <select
                    value={row.ingredientId}
                    onChange={(e) => updateRow(index, "ingredientId", e.target.value)}
                    className="flex-1 rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
                  >
                    <option value="">Select ingredient…</option>
                    {ingredients.map((ing) => (
                      <option key={ing._id} value={ing._id}>
                        {ing.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.qty}
                    onChange={(e) => updateRow(index, "qty", e.target.value)}
                    placeholder="Qty"
                    className="w-24 rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
                  />
                  <span className="w-10 text-xs text-(--color-text-muted)">{ingredientUnit(row.ingredientId)}</span>
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-(--color-text-muted) transition-colors hover:bg-red-500/10 hover:text-red-500"
                  >
                    <Delete02Icon size={14} strokeWidth={1.8} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addRow}
              className="mt-2 flex items-center gap-1.5 text-sm font-medium text-(--color-accent)"
            >
              <PlusSignIcon size={14} strokeWidth={1.8} />
              Add ingredient
            </button>

            {error && <div className="mt-3 text-xs text-red-500">{error}</div>}

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                className="rounded-md bg-(--color-accent) px-4 py-2 text-sm font-medium text-white"
              >
                Save Recipe
              </button>
              {saved && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckmarkCircle02Icon size={14} strokeWidth={1.8} />
                  Saved
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
