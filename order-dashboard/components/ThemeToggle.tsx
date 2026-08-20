import { Sun03Icon, Moon02Icon } from "hugeicons-react";
import { useTheme } from "../lib/useTheme";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-(--color-text-muted) transition-colors hover:bg-black/5 hover:text-(--color-text) dark:hover:bg-white/10"
    >
      {theme === "dark" ? <Sun03Icon size={16} strokeWidth={1.8} /> : <Moon02Icon size={16} strokeWidth={1.8} />}
      <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
