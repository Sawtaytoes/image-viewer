// Minimal ESLint flat config. Biome (biome.json) owns formatting and most
// linting; ESLint only adds rules Biome cannot express. Adapted from the
// mux-magic config (monorepo-specific rules dropped). See
// docs/research/0003-linting-and-formatting.md.
//
// The app source is still JavaScript (Biome owns its formatting + most lint).
// React Hooks rules run on .js/.jsx so the legacy inline
// `eslint-disable react-hooks/*` directives resolve and hook bugs are caught;
// the type-aware rules below activate as files convert to .ts/.tsx.

import { defineConfig } from "eslint/config"
import reactPlugin from "eslint-plugin-react"
import reactHooks from "eslint-plugin-react-hooks"
import tseslint from "typescript-eslint"

// Booleans must start with `is` or `has` (needs TS type info, so it lives in
// ESLint, not Biome). `_`/`__`-prefixed names are exempt.
const IS_HAS_BOOLEAN_RULE = {
  selector: [
    "variable",
    "parameter",
    "typeProperty",
    "classProperty",
  ],
  types: ["boolean"],
  format: null,
  prefix: ["is", "has"],
  filter: { regex: "^(__|_)", match: false },
}

export default defineConfig(
  {
    ignores: [
      "**/node_modules/**",
      "**/.vite/**",
      "**/out/**",
      "**/dist/**",
      "**/build/**",
      "docs/**",
      "*.config.ts",
      "*.config.mjs",
      "forge.env.d.ts",
    ],
  },
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [tseslint.configs.base],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        projectService: true,
      },
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks,
    },
    settings: {
      // Pin the version rather than "detect": eslint-plugin-react's
      // auto-detection calls the `context.getFilename()` API removed in
      // ESLint 9+, which crashes the moment a react rule (no-multi-comp below)
      // runs on a `.ts`/`.tsx` file. An explicit version skips detection.
      react: { version: "19.2" },
    },
    rules: {
      // Spell names out — no single letters (Biome has no equivalent).
      "id-length": [
        "error",
        {
          min: 2,
          exceptions: ["_", "$"],
          properties: "never",
        },
      ],
      "@typescript-eslint/naming-convention": [
        "error",
        IS_HAS_BOOLEAN_RULE,
      ],
      // One component per file.
      "react/no-multi-comp": [
        "error",
        { ignoreStateless: false },
      ],
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
)
