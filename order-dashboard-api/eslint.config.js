const js = require("@eslint/js");
const tseslint = require("typescript-eslint");
const globals = require("globals");

module.exports = tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**"],
  },
  // Plain CommonJS config files (this file, jest.config.js) — not part of
  // the TS project, so they get Node globals instead of type-aware linting.
  {
    files: ["*.js"],
    languageOptions: { sourceType: "commonjs", globals: globals.node },
  },
  js.configs.recommended,
  {
    files: ["src/**/*.ts", "tests/**/*.ts", "prisma/**/*.ts"],
    extends: [...tseslint.configs.recommended],
    languageOptions: { globals: globals.node },
    rules: {
      // This codebase leans on `any` at Prisma/Express boundaries (raw
      // req.body, dynamic where-clauses) — banning it outright would mean
      // fighting the type system more than the lint rule is worth here.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  }
);
