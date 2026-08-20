import { ChefHatIcon } from "hugeicons-react";

export default function CafeRecipesPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-10 py-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-(--color-accent)/10 text-(--color-accent)">
        <ChefHatIcon size={30} strokeWidth={1.8} />
      </div>
      <h1 className="mb-2 text-2xl font-semibold">Recipes</h1>
      <p className="max-w-sm text-sm text-(--color-text-muted)">
        Ingredient-linked recipes with automatic stock deduction on order are coming soon.
      </p>
    </div>
  );
}
