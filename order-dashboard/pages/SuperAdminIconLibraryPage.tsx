import { useEffect, useState } from "react";
import { Image01Icon, Delete02Icon, PlusSignIcon, Search01Icon, Cancel01Icon } from "hugeicons-react";
import { getMenuIcons, createMenuIcon, deleteMenuIcon } from "../lib/api";

const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function SuperAdminIconLibraryPage() {
  const [icons, setIcons] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setIcons(await getMenuIcons(search));
  }

  useEffect(() => {
    refresh();
  }, [search]);

  function closeForm() {
    setShowForm(false);
    setName("");
    setImageDataUrl("");
    setError("");
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setError(`Image is too large — must be under ${MAX_IMAGE_BYTES / (1024 * 1024)}MB.`);
      return;
    }
    setImageDataUrl(await readFileAsDataUrl(file));
  }

  async function handleAdd() {
    setError("");
    if (!name.trim() || !imageDataUrl) {
      setError("Give the icon a name and choose an image file first.");
      return;
    }
    setSaving(true);
    try {
      await createMenuIcon({ name: name.trim(), image: imageDataUrl });
      closeForm();
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add icon");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteMenuIcon(id);
    refresh();
  }

  return (
    <div className="px-8 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Image01Icon size={20} strokeWidth={1.8} />
            Menu Icon Library
          </h1>
          <p className="mt-1 text-sm text-(--color-text-muted)">
            Upload icons here for cafe owners to pick from when adding a menu item — keeps every cafe's menu grid
            visually consistent instead of a mix of stretched or mismatched photos. Name each one clearly (e.g.
            "Cheese Burger", "Iced Latte") so it's easy to find in search.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-md bg-(--color-accent) px-3 py-1.5 text-sm font-medium text-white"
        >
          <PlusSignIcon size={14} strokeWidth={1.8} />
          Add Icon
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <div className="relative w-64">
          <Search01Icon
            size={16}
            strokeWidth={1.8}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-(--color-text-muted)"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search icons…"
            className="w-full rounded-md border border-(--color-border) bg-transparent py-1.5 pl-8 pr-3 text-sm outline-none focus:border-(--color-accent)"
          />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-(--color-border)">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-(--color-border) text-xs text-(--color-text-muted)">
              <th className="w-16 px-3 py-2 font-medium">Icon</th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {icons.map((icon: any) => (
              <tr key={icon._id} className="border-b border-(--color-border) last:border-0 hover:bg-black/5 dark:hover:bg-white/5">
                <td className="px-3 py-2">
                  <img src={icon.image} alt={icon.name} className="h-9 w-9 object-contain" />
                </td>
                <td className="px-3 py-2 font-medium">{icon.name}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => handleDelete(icon._id)}
                    title="Delete"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-(--color-text-muted) transition-colors hover:bg-red-500/10 hover:text-red-500"
                  >
                    <Delete02Icon size={14} strokeWidth={1.8} />
                  </button>
                </td>
              </tr>
            ))}
            {icons.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-8 text-center text-sm text-(--color-text-muted)">
                  No icons yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/30 p-4" onClick={closeForm}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl border border-(--color-border) bg-(--color-canvas) p-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Add Icon</h2>
              <button
                type="button"
                onClick={closeForm}
                className="flex h-7 w-7 items-center justify-center rounded-md text-(--color-text-muted) transition-colors hover:bg-black/5 hover:text-(--color-text) dark:hover:bg-white/10"
              >
                <Cancel01Icon size={16} strokeWidth={1.8} />
              </button>
            </div>

            <div className="mt-4 flex items-start gap-3">
              <label className="relative flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-(--color-border) bg-black/5 dark:bg-white/5">
                {imageDataUrl ? (
                  <img src={imageDataUrl} alt="" className="h-full w-full object-contain" />
                ) : (
                  <Image01Icon size={22} strokeWidth={1.8} className="text-(--color-text-muted)" />
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  onChange={handleFile}
                  className="hidden"
                />
              </label>
              <div className="flex-1">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Icon name (e.g. Cheese Burger)"
                  className="w-full rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
                />
                <p className="mt-1.5 text-[11px] text-(--color-text-muted)">
                  Click the box to choose an image (PNG, JPEG, WebP, GIF, SVG — under 1.5MB).
                </p>
              </div>
            </div>

            {error && <div className="mt-2 text-xs text-red-500">{error}</div>}

            <button
              type="button"
              onClick={handleAdd}
              disabled={saving}
              className="mt-4 w-full rounded-md bg-(--color-accent) py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? "Adding…" : "Add Icon"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
