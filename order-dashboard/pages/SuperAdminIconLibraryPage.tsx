import { useEffect, useState } from "react";
import { Image01Icon, Delete02Icon, PlusSignIcon } from "hugeicons-react";
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
      setName("");
      setImageDataUrl("");
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
    <div className="px-10 py-8">
      <h1 className="flex items-center gap-2 text-2xl font-semibold">
        <Image01Icon size={20} strokeWidth={1.8} />
        Menu Icon Library
      </h1>
      <p className="mt-1 text-sm text-(--color-text-muted)">
        Upload icons here for cafe owners to pick from when adding a menu item — keeps every cafe's menu grid
        visually consistent instead of a mix of stretched or mismatched photos. Name each one clearly (e.g. "Cheese
        Burger", "Iced Latte") so it's easy to find in search.
      </p>

      <div className="mt-6 max-w-lg rounded-xl border border-(--color-border) p-4">
        <div className="text-sm font-medium">Add an icon</div>
        <div className="mt-3 flex items-start gap-3">
          <label className="relative flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-(--color-border) bg-black/5 dark:bg-white/5">
            {imageDataUrl ? (
              <img src={imageDataUrl} alt="" className="h-full w-full object-contain" />
            ) : (
              <Image01Icon size={22} strokeWidth={1.8} className="text-(--color-text-muted)" />
            )}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" onChange={handleFile} className="hidden" />
          </label>
          <div className="flex-1">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Icon name (e.g. Cheese Burger)"
              className="w-full rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
            />
            <p className="mt-1.5 text-[11px] text-(--color-text-muted)">Click the box to choose an image (PNG, JPEG, WebP, GIF, SVG — under 1.5MB).</p>
          </div>
        </div>
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        <button
          type="button"
          onClick={handleAdd}
          disabled={saving}
          className="mt-3 flex items-center gap-1.5 rounded-md bg-(--color-accent) px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          <PlusSignIcon size={14} strokeWidth={1.8} />
          {saving ? "Adding…" : "Add Icon"}
        </button>
      </div>

      <div className="mt-6 max-w-2xl">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search icons…"
          className="w-full rounded-md border border-(--color-border) bg-transparent p-2 text-sm outline-none focus:border-(--color-accent)"
        />
        <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-6">
          {icons.map((icon: any) => (
            <div key={icon._id} className="group relative flex flex-col items-center gap-1.5 rounded-lg border border-(--color-border) p-3">
              <img src={icon.image} alt={icon.name} className="h-10 w-10 object-contain" />
              <span className="text-center text-[11px] text-(--color-text-muted)">{icon.name}</span>
              <button
                type="button"
                onClick={() => handleDelete(icon._id)}
                title="Delete"
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-md text-(--color-text-muted) opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100"
              >
                <Delete02Icon size={13} strokeWidth={1.8} />
              </button>
            </div>
          ))}
          {icons.length === 0 && (
            <p className="col-span-full py-8 text-center text-sm text-(--color-text-muted)">No icons yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
