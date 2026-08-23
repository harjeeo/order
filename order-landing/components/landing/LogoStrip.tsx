const LOGOS = ["Northwind", "Brandmark", "Coffee Co.", "Graincraft", "Aurabites"];

export default function LogoStrip() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 xl:px-10">
      <p className="text-center text-xs font-medium text-(--color-text-muted)">Trusted by 500+ growing businesses</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-60 grayscale">
        {LOGOS.map((name) => (
          <span key={name} className="text-lg font-semibold tracking-tight text-(--color-text)">
            {name}
          </span>
        ))}
      </div>
    </section>
  );
}
