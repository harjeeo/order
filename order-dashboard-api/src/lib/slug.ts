import { prisma } from "../prisma";

// Turns a cafe name into a URL-safe slug ("Tanvir's Cafe & Bakery" ->
// "tanvirs-cafe-bakery"), used for the public menu link
// (pos.getojar.com/menu/:slug) every tenant gets on creation.
function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "cafe";
}

// Appends "-2", "-3", etc. until the slug is free — collisions are rare
// (most cafe names are distinct) but common enough (e.g. two "Cafe Coffee
// Day" franchisees) to handle rather than let tenant creation fail.
export async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let attempt = 1;
  while (await prisma.tenant.findUnique({ where: { slug: candidate } })) {
    attempt += 1;
    candidate = `${base}-${attempt}`;
  }
  return candidate;
}
