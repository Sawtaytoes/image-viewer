# 2026-06-02 — Use Yarn 4 (Berry) with nodeLinker node-modules

- **Status:** Locked
- **Date:** 2026-06-02
- **Deciders:** Kevin (owner) + agent
- **Source:** Migrated from `docs/research/0008-package-manager-yarn4.md` (Phase 1 modernization)

## Decision (the rule)

Move to **Yarn 4.16.0 (Berry)**, managed by Corepack via the `packageManager` field. Set **`nodeLinker: node-modules`** (not PnP). Configure `.yarnrc.yml` to keep the Electron toolchain working.

## What was rejected ("no, that's wrong")

- **Yarn 1.22 (Classic)** — the prior version. Owner: *"upgrade the yarn version… I want us on the very latest, not old stuff."*
- **Yarn 4's default Plug'n'Play (PnP)** — Electron Forge + `@electron/packager` + native tooling do not support it. The classic `node_modules` layout keeps the whole Electron toolchain working.

## Why

The owner wants the latest tooling, but Yarn 4's secure-by-default settings actively block an Electron build unless adjusted. The classic linker plus targeted `.yarnrc.yml` overrides keep "latest" without breaking Forge/Electron.

## How to honor it

`.yarnrc.yml` settings, each required for a working build:
- **`nodeLinker: node-modules`** — PnP is unsupported by the Electron toolchain.
- **`npmMinimalAgeGate: 0`** — disables Yarn 4.16's supply-chain age gate (defaults to 1440 min, quarantining anything published in the last 24 h). With it on, `yarn install` failed: `electron@npm:^42.3.1: All versions … are quarantined`. Trade-off: may install day-0 versions; acceptable given the explicit "latest" requirement. Could later use a smaller window (e.g. `60`) + `npmPreapprovedPackages`.
- **`approvedGitRepositories: ["https://github.com/electron/node-gyp.git", "https://github.com/electron/*"]`** — Yarn 4.16 blocks git deps unless allowlisted; Forge pulls `@electron/node-gyp` as a git dep via `@electron/rebuild`.
- **`enableScripts: true`** — Yarn 4.16 defaults to `false`; with it off Electron's postinstall never downloads the binary (`node_modules/electron/dist` empty) and `yarn start`/`yarn make` fail. Could later narrow to per-package opt-in via `dependenciesMeta`.

Repo hygiene: `.gitignore` updated for Berry (ignore `.yarn/*` except `releases`/`plugins`/`patches`/`sdks`/`versions`, ignore `.pnp.*` and `.env` — the owner's `GITEA_TOKEN` lives there). Run `corepack enable` on any build machine. The Yarn 1 `yarn.lock` was removed and regenerated in Yarn 4 format.

## Evidence

Original ADR `docs/research/0008-package-manager-yarn4.md`. Owner: *"upgrade the yarn version `yarn set version stable` … I want us on the very latest, not old stuff."*

## Related

- [[2026-06-02-build-toolchain-electron-forge-vite]]
