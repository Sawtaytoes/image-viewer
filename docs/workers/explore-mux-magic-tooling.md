# Worker: extract mux-magic tooling config

- **Agent type:** Explore (read-only)
- **Run:** 2026-06-02, Phase 1 planning
- **Feeds:** [decisions/2026-06-02-linting-biome-plus-minimal-eslint.md](../decisions/2026-06-02-linting-biome-plus-minimal-eslint.md)

## Prompt

> Explore the repository at `D:\Projects\Personal\mux-magic` (a different project on this machine).
> I need to copy its linting/formatting/TypeScript tooling setup into another project. Do NOT modify
> anything — read only.
>
> Report back, with full file contents (verbatim) where they exist:
> 1. **Biome config** — `biome.json`/`biome.jsonc` (full contents).
> 2. **ESLint config** — `eslint.config.{js,mjs,ts}` or `.eslintrc*` (full contents; note flat vs legacy).
> 3. **Prettier config** if present.
> 4. **TypeScript config** — `tsconfig.json` and any `tsconfig.*.json` (full contents).
> 5. **package.json** — the `scripts` block verbatim, exact versions of biome/eslint/prettier/
>    typescript + eslint plugins, the package manager, and the `type` field.
> 6. **Editor/CI integration** — `.editorconfig`, `.vscode/settings.json` (biome/eslint keys), and
>    any lint/format/typecheck CI commands.
> 7. Whether mux-magic is itself an Electron app (and if so, its forge/vite/builder config).
>
> Quote actual file contents so they can be copied verbatim. If a file doesn't exist, say so.

## Outcome (summary)

Biome 2 is primary (format + most lint); a minimal ESLint flat config (`eslint.config.js`, ESM)
adds only rules Biome can't express. No Prettier. `tsconfig.base.json` is `strict`. Yarn 4, ESM.
mux-magic is **not** Electron. The monorepo-specific ESLint rules were dropped when adapting here.
