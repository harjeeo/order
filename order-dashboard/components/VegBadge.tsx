// The standard Indian veg/non-veg mark: a small square outline with a
// filled dot — green for veg, brown/maroon for non-veg. Deliberately not
// using any icon library glyph here since this exact two-colour symbol is
// what diners actually recognise on menus.
export default function VegBadge({ isVeg, size = 14 }: { isVeg: boolean; size?: number }) {
  const color = isVeg ? "#0f8a3c" : "#8b2e2e";
  return (
    <span
      title={isVeg ? "Veg" : "Non-Veg"}
      className="inline-flex shrink-0 items-center justify-center rounded-[3px] border"
      style={{ width: size, height: size, borderColor: color }}
    >
      <span className="rounded-full" style={{ width: size * 0.45, height: size * 0.45, backgroundColor: color }} />
    </span>
  );
}
