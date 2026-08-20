import { RestaurantIcon } from "hugeicons-react";

export default function Logo({ size = "md" }: { size?: "sm" | "md" }) {
  const box = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const icon = size === "sm" ? 15 : 17;
  const text = size === "sm" ? "text-sm" : "text-base";

  return (
    <a href="#top" className="flex items-center gap-2">
      <span className={`flex ${box} items-center justify-center rounded-lg bg-(--color-accent) text-white`}>
        <RestaurantIcon size={icon} strokeWidth={1.8} />
      </span>
      <span className={`${text} font-semibold tracking-tight text-(--color-text)`}>
        Order<span className="text-(--color-accent)">Dashboard</span>
      </span>
    </a>
  );
}
