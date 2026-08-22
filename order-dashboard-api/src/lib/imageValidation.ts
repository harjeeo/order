// Shared by menu item photo uploads and the Super-Admin-curated menu icon
// library — a real type + decoded-size check so a phone camera photo (or a
// bad-faith upload) can't silently bloat the DB. base64 inflates size
// ~33%, so the check is against the decoded byte count, not the string
// length.
const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024; // 1.5MB decoded
const ALLOWED_IMAGE_TYPES = ["png", "jpeg", "jpg", "webp", "gif"];
// SVG can carry embedded scripts (XSS) — off by default, only worth the
// risk for admin-only uploads like the icon library, never for menu-item
// photos any staff member can upload.
const SVG_TYPE = "svg+xml";

export function validateImage(
  image: string | undefined,
  { required = false, allowSvg = false }: { required?: boolean; allowSvg?: boolean } = {}
): string | null {
  if (!image || !image.startsWith("data:image")) {
    return required ? "An image is required" : null;
  }
  const match = image.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return "Invalid image format";
  const [, type, base64] = match;
  const allowedTypes = allowSvg ? [...ALLOWED_IMAGE_TYPES, SVG_TYPE] : ALLOWED_IMAGE_TYPES;
  if (!allowedTypes.includes(type.toLowerCase())) {
    return `Unsupported image type: ${type}. Use PNG, JPEG, WebP${allowSvg ? ", GIF or SVG" : " or GIF"}.`;
  }
  const byteSize = Math.ceil((base64.length * 3) / 4);
  if (byteSize > MAX_IMAGE_BYTES) {
    return `Image is too large (${(byteSize / (1024 * 1024)).toFixed(1)}MB) — must be under ${MAX_IMAGE_BYTES / (1024 * 1024)}MB.`;
  }
  return null;
}
