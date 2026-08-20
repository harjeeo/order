import { useEffect, useState } from "react";
import { PlusSignIcon, Edit02Icon, Delete02Icon, Cancel01Icon } from "hugeicons-react";
import {
  getMenuCategories,
  addMenuCategory,
  removeMenuCategory,
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability,
} from "../lib/api";

function emptyForm() {
  return {
    name: "",
    category: "",
    image: "🍽️",
    price: "",
    tax: 5,
    available: true,
    variants: [],
    addons: [],
  };
}

function formatCurrency(n) {
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

function isPhotoUrl(value) {
  return typeof value === "string" && value.startsWith("data:image");
}

export default function CafeMenuPage() {
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [items, setItems] = useState([]);
  const [newCategory, setNewCategory] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(null);
  const [formError, setFormError] = useState("");

  async function refreshCategories() {
    setCategories(await getMenuCategories());
  }

  async function refreshItems() {
    setItems(await getMenuItems({ category: activeCategory }));
  }

  useEffect(() => {
    refreshCategories();
  }, []);

  useEffect(() => {
    refreshItems();
  }, [activeCategory]);

  async function handleAddCategory() {
    if (!newCategory.trim()) return;
    await addMenuCategory(newCategory.trim());
    setNewCategory("");
    refreshCategories();
  }

  async function handleDeleteCategory(name) {
    await removeMenuCategory(name);
    if (activeCategory === name) setActiveCategory("All");
    refreshCategories();
    refreshItems();
  }

  function startCreate() {
    setEditingId("new");
    setFormError("");
    setForm({ ...emptyForm(), category: categories.find((c) => c !== "All") ?? "" });
  }

  function startEdit(item) {
    setEditingId(item._id);
    setFormError("");
    setForm({ ...item, price: String(item.price) });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(null);
    setFormError("");
  }

  function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, image: reader.result }));
    reader.readAsDataURL(file);
  }

  function updateVariantRow(idx, field, value) {
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v, i) => (i === idx ? { ...v, [field]: value } : v)),
    }));
  }

  function addVariantRow() {
    setForm((f) => ({ ...f, variants: [...f.variants, { name: "", price: "" }] }));
  }

  function removeVariantRow(idx) {
    setForm((f) => ({ ...f, variants: f.variants.filter((_, i) => i !== idx) }));
  }

  function updateAddonRow(idx, field, value) {
    setForm((f) => ({
      ...f,
      addons: f.addons.map((a, i) => (i === idx ? { ...a, [field]: value } : a)),
    }));
  }

  function addAddonRow() {
    setForm((f) => ({ ...f, addons: [...f.addons, { name: "", price: "" }] }));
  }

  function removeAddonRow(idx) {
    setForm((f) => ({ ...f, addons: f.addons.filter((_, i) => i !== idx) }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setFormError("Item name is required.");
      return;
    }
    if (!form.category) {
      setFormError("Add a category first, then pick it here.");
      return;
    }
    setFormError("");
    const payload = {
      name: form.name.trim(),
      category: form.category,
      image: form.image || "🍽️",
      price: Number(form.price) || 0,
      tax: Number(form.tax) || 0,
      available: form.available,
      variants: form.variants
        .filter((v) => v.name.trim())
        .map((v) => ({ name: v.name.trim(), price: Number(v.price) || 0 })),
      addons: form.addons
        .filter((a) => a.name.trim())
        .map((a) => ({ name: a.name.trim(), price: Number(a.price) || 0 })),
    };
    try {
      if (editingId === "new") {
        await createMenuItem(payload);
      } else {
        await updateMenuItem(editingId, payload);
      }
      cancelEdit();
      refreshItems();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save item");
    }
  }

  async function handleDelete(item) {
    await deleteMenuItem(item._id);
    if (editingId === item._id) cancelEdit();
    refreshItems();
  }

  async function handleToggleAvailability(item) {
    await toggleMenuItemAvailability(item._id);
    refreshItems();
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Menu</h1>
            <p className="mt-1 text-sm text-(--color-text-muted)">Categories, items, variants and add-ons.</p>
          </div>
          <button
            type="button"
            onClick={startCreate}
            className="flex items-center gap-1.5 rounded-md bg-(--color-accent) px-3 py-1.5 text-sm font-medium text-white"
          >
            <PlusSignIcon size={14} strokeWidth={1.8} />
            Add Item
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {categories.map((c) => (
            <span
              key={c}
              className={`flex items-center gap-1 rounded-full pl-3 pr-1.5 py-1 text-xs font-medium transition-colors ${
                activeCategory === c
                  ? "bg-(--color-accent) text-white"
                  : "bg-black/5 text-(--color-text-muted) hover:bg-black/10 dark:bg-white/10"
              }`}
            >
              <button type="button" onClick={() => setActiveCategory(c)}>
                {c}
              </button>
              {c !== "All" && (
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(c)}
                  title={`Delete ${c}`}
                  className={`flex h-4 w-4 items-center justify-center rounded-full ${
                    activeCategory === c ? "hover:bg-white/20" : "hover:bg-black/10 dark:hover:bg-white/20"
                  }`}
                >
                  <Cancel01Icon size={10} strokeWidth={2} />
                </button>
              )}
            </span>
          ))}
          <div className="flex items-center gap-1">
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
              placeholder="New category…"
              className="w-32 rounded-md border border-(--color-border) bg-transparent px-2 py-1 text-xs outline-none focus:border-(--color-accent)"
            />
            <button
              type="button"
              onClick={handleAddCategory}
              className="flex h-6 w-6 items-center justify-center rounded-md border border-(--color-border)"
            >
              <PlusSignIcon size={12} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <div key={item._id} className="rounded-xl border border-(--color-border) p-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {isPhotoUrl(item.image) ? (
                    <img src={item.image} alt={item.name} className="h-9 w-9 rounded-md object-cover" />
                  ) : (
                    <span className="text-2xl">{item.image}</span>
                  )}
                  <div>
                    <div className="text-sm font-medium">{item.name}</div>
                    <div className="text-xs text-(--color-text-muted)">{item.category}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-(--color-text-muted) transition-colors hover:bg-black/5 hover:text-(--color-text) dark:hover:bg-white/10"
                  >
                    <Edit02Icon size={14} strokeWidth={1.8} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-(--color-text-muted) transition-colors hover:bg-red-500/10 hover:text-red-500"
                  >
                    <Delete02Icon size={14} strokeWidth={1.8} />
                  </button>
                </div>
              </div>

              {item.variants.length > 0 ? (
                <ul className="mt-2 space-y-0.5 text-xs text-(--color-text-muted)">
                  {item.variants.map((v) => (
                    <li key={v.name} className="flex justify-between">
                      <span>{v.name}</span>
                      <span className="tabular-nums">{formatCurrency(v.price)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-2 text-sm tabular-nums">{formatCurrency(item.price)}</div>
              )}

              {item.addons.length > 0 && (
                <div className="mt-1.5 text-[11px] text-(--color-text-muted)">
                  Add-ons: {item.addons.map((a) => a.name).join(", ")}
                </div>
              )}

              <div className="mt-2 flex items-center justify-between text-[11px] text-(--color-text-muted)">
                <span>Tax {item.tax}%</span>
                <button
                  type="button"
                  onClick={() => handleToggleAvailability(item)}
                  className={`rounded-full px-2 py-0.5 font-medium ${
                    item.available ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 text-red-500"
                  }`}
                >
                  {item.available ? "Available" : "Out of Stock"}
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="col-span-full py-8 text-center text-sm text-(--color-text-muted)">No items in this category.</div>
          )}
        </div>
      </div>

      {form && (
        <div className="w-96 shrink-0 overflow-y-auto border-l border-(--color-border) p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">{editingId === "new" ? "Add Item" : "Edit Item"}</h2>
            <button
              type="button"
              onClick={cancelEdit}
              className="flex h-7 w-7 items-center justify-center rounded-md text-(--color-text-muted) transition-colors hover:bg-black/5 hover:text-(--color-text) dark:hover:bg-white/10"
            >
              <Cancel01Icon size={16} strokeWidth={1.8} />
            </button>
          </div>

          <div className="mt-4 flex items-start gap-3">
            <label className="relative flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-(--color-border) bg-black/5 dark:bg-white/5">
              {isPhotoUrl(form.image) ? (
                <img src={form.image} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-3xl">{form.image}</span>
              )}
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
            <div className="flex-1">
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Item name"
                className="w-full rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
              />
              <input
                value={isPhotoUrl(form.image) ? "" : form.image}
                onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
                placeholder="or type an emoji, e.g. 🍔"
                maxLength={2}
                className="mt-2 w-full rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
              />
            </div>
          </div>
          <p className="mt-1.5 text-[11px] text-(--color-text-muted)">Click the photo box to upload an image, or use the emoji field.</p>

          <select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className="mt-2 w-full rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none"
          >
            {categories
              .filter((c) => c !== "All")
              .map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
          </select>

          <div className="mt-2 flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-(--color-text-muted)">Base Price</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                className="mt-1 w-full rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-(--color-text-muted)">Tax %</label>
              <input
                type="number"
                value={form.tax}
                onChange={(e) => setForm((f) => ({ ...f, tax: e.target.value }))}
                className="mt-1 w-full rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
              />
            </div>
          </div>

          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.available}
              onChange={(e) => setForm((f) => ({ ...f, available: e.target.checked }))}
            />
            Available
          </label>

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs font-medium text-(--color-text-muted)">
              Variants
              <button type="button" onClick={addVariantRow} className="text-(--color-accent)">
                + Add
              </button>
            </div>
            <div className="mt-2 flex flex-col gap-1.5">
              {form.variants.map((v, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <input
                    value={v.name}
                    onChange={(e) => updateVariantRow(idx, "name", e.target.value)}
                    placeholder="Name"
                    className="flex-1 rounded-md border border-(--color-border) bg-transparent px-2 py-1 text-xs outline-none"
                  />
                  <input
                    type="number"
                    value={v.price}
                    onChange={(e) => updateVariantRow(idx, "price", e.target.value)}
                    placeholder="Price"
                    className="w-20 rounded-md border border-(--color-border) bg-transparent px-2 py-1 text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeVariantRow(idx)}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-(--color-text-muted) transition-colors hover:bg-red-500/10 hover:text-red-500"
                  >
                    <Delete02Icon size={13} strokeWidth={1.8} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs font-medium text-(--color-text-muted)">
              Add-ons
              <button type="button" onClick={addAddonRow} className="text-(--color-accent)">
                + Add
              </button>
            </div>
            <div className="mt-2 flex flex-col gap-1.5">
              {form.addons.map((a, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <input
                    value={a.name}
                    onChange={(e) => updateAddonRow(idx, "name", e.target.value)}
                    placeholder="Name"
                    className="flex-1 rounded-md border border-(--color-border) bg-transparent px-2 py-1 text-xs outline-none"
                  />
                  <input
                    type="number"
                    value={a.price}
                    onChange={(e) => updateAddonRow(idx, "price", e.target.value)}
                    placeholder="Price"
                    className="w-20 rounded-md border border-(--color-border) bg-transparent px-2 py-1 text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeAddonRow(idx)}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-(--color-text-muted) transition-colors hover:bg-red-500/10 hover:text-red-500"
                  >
                    <Delete02Icon size={13} strokeWidth={1.8} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {formError && <div className="mt-3 text-xs text-red-500">{formError}</div>}

          <button
            type="button"
            onClick={handleSave}
            className="mt-5 w-full rounded-md bg-(--color-accent) py-2 text-sm font-medium text-white"
          >
            {editingId === "new" ? "Add Item" : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
}
