import { useEffect, useState } from "react";
import { ChefHatIcon, PlusSignIcon, Delete02Icon, CheckmarkCircle02Icon, Cancel01Icon } from "hugeicons-react";
import { getMenuItems, getIngredients, getRecipe, saveRecipe } from "../lib/api";

function emptyRow() {
  return { ingredientId: "", qty: "" };
}

export default function CafeRecipesPage() {
  const [items, setItems] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [recipeCounts, setRecipeCounts] = useState({});
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
      setRecipeCounts((c) => ({ ...c, [selectedId]: recipe.length }));
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
      setRecipeCounts((c) => ({ ...c, [selectedId]: valid.length }));
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save recipe");
    }
  }

  const selectedItem = items.find((i) => i._id === selectedId);

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <ChefHatIcon size={20} strokeWidth={1.8} />
          Recipes
        </h1>
        <p className="mt-1 text-sm text-(--color-text-muted)">
          Pick a menu item to link its ingredients. Stock is deducted automatically whenever an order with that item is
          placed.
        </p>

        <div className="mt-4 overflow-x-auto rounded-xl border border-(--color-border)">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-(--color-border) text-xs text-(--color-text-muted)">
                <th className="px-3 py-2 font-medium">Item</th>
                <th className="px-3 py-2 font-medium">Price</th>
                <th className="px-3 py-2 font-medium">Ingredients Linked</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item._id}
                  onClick={() => setSelectedId(item._id)}
                  className={`cursor-pointer border-b border-(--color-border) last:border-0 hover:bg-black/5 dark:hover:bg-white/5 ${
                    selectedId === item._id ? "bg-black/5 dark:bg-white/10" : ""
                  }`}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {item.image && item.image.startsWith("data:image") ? (
                        <img src={item.image} alt="" className="h-7 w-7 shrink-0 rounded-md object-cover" />
                      ) : (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-(--color-accent)/10 text-sm">
                          {item.image && !item.image.startsWith("data:image") ? item.image : "🍽️"}
                        </span>
                      )}
                      <span className="font-medium">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 tabular-nums text-(--color-text-muted)">₹{item.price}</td>
                  <td className="px-3 py-2 text-(--color-text-muted)">
                    {recipeCounts[item._id] != null ? `${recipeCounts[item._id]} linked` : "-"}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-8 text-center text-sm text-(--color-text-muted)">
                    No menu items yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedId && (
        <div className="w-96 shrink-0 overflow-y-auto border-l border-(--color-border) p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-(--color-accent)/10 text-(--color-accent)">
                <ChefHatIcon size={16} strokeWidth={1.8} />
              </span>
              <div>
                <div className="text-sm font-semibold">{selectedItem?.name}</div>
                <div className="text-xs text-(--color-text-muted)">Ingredients consumed per 1 unit</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedId("")}
              className="flex h-7 w-7 items-center justify-center rounded-md text-(--color-text-muted) transition-colors hover:bg-black/5 hover:text-(--color-text) dark:hover:bg-white/10"
            >
              <Cancel01Icon size={16} strokeWidth={1.8} />
            </button>
          </div>

          <h3 className="mt-5 text-xs font-medium text-(--color-text-muted)">Ingredients</h3>
          <div className="mt-2 flex flex-col gap-2">
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
                  className="w-20 rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
                />
                <span className="w-9 text-xs text-(--color-text-muted)">{ingredientUnit(row.ingredientId)}</span>
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
  );
}
