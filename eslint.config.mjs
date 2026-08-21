// Minimal ESLint flat config. Biome (biome.json) owns formatting and most
// linting; ESLint only adds rules Biome cannot express — and those now come
// from `@charcuterie/eslint-config`, the fleet's shared house rules, rather
// than a local copy of mux-magic's. See
// docs/research/0003-linting-and-formatting.md.
//
// The app source is still partly JavaScript (Biome owns its formatting + most
// lint). React Hooks rules run on .js/.jsx so the legacy inline
// `eslint-disable react-hooks/*` directives resolve and hook bugs are caught;
// the type-aware rules activate on .ts/.tsx.

import {
  COMPONENT_CHOICE_NAMESPACE,
  componentChoicePlugin,
  createReactRules,
  createTestRules,
  createTypedRules,
} from "@charcuterie/eslint-config"
import { defineConfig } from "eslint/config"
import reactHooks from "eslint-plugin-react-hooks"

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
  createTypedRules({
    files: ["src/**/*.{ts,tsx}"],
    tsconfigRootDir: import.meta.dirname,
  }),
  // One component per file.
  createReactRules({
    files: ["src/**/*.{ts,tsx}"],
    // Pin the version rather than "detect": eslint-plugin-react's
    // auto-detection calls the `context.getFilename()` API removed in
    // ESLint 9+, which crashes the moment a react rule runs on a `.tsx` file.
    version: "19.2",
  }),
  createTestRules({
    files: ["src/**/*.test.{ts,tsx}"],
  }),
  {
    // Every picker is a `Listbox`, never a native `Select` — the OS widget is
    // not stylable and looks wrong on Windows, which is the whole objection.
    // See the fleet decision (`agentic`,
    // `docs/decisions/2026-08-20-listbox-is-the-picker-in-every-owned-app-and-native-select-is-a-hatch-we-have-never-needed.md`)
    // and the library's own (`charcuterie`,
    // `docs/decisions/2026-08-10-listbox-and-combobox-are-the-default-and-select-is-demoted.md`).
    //
    // Two rules, hand-picked rather than `createComponentChoiceRules()`. That
    // helper turns on the whole component-choice block — `no-raw-button`,
    // `no-raw-anchor`, `no-clickable-non-interactive` — and this app still has
    // raw `<button>`s in the tab strip and the gallery tiles, so the block
    // would go red on adoption day and get reverted rather than migrated. The
    // two picker rules are already green, so they can be locked in now and the
    // rest of the block adopted when those call sites are converted.
    files: ["src/**/*.tsx"],
    plugins: {
      [COMPONENT_CHOICE_NAMESPACE]: componentChoicePlugin,
    },
    rules: {
      [`${COMPONENT_CHOICE_NAMESPACE}/no-raw-select`]:
        "error",
      [`${COMPONENT_CHOICE_NAMESPACE}/prefer-listbox-over-select`]:
        "error",
    },
  },
  {
    // Hooks rules are this app's own — the shared config does not carry
    // eslint-plugin-react-hooks.
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
)
