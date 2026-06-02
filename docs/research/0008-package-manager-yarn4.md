# 0008 — Package manager: Yarn 4 (Berry)

- **Status:** Accepted (Phase 1)
- **Date:** 2026-06-02
- **Deciders:** Kevin (owner) + agent.

## Context

The repo used Yarn 1.22 (Classic). The owner: *"upgrade the yarn version `yarn set version stable`
… I want us on the very latest, not old stuff."*

## Decision

Move to **Yarn 4.16.0 (Berry)**, managed by Corepack via the `packageManager` field in `package.json`.

## Configuration (`.yarnrc.yml`)

- **`nodeLinker: node-modules`** — REQUIRED. Yarn 4 defaults to Plug'n'Play (PnP), which Electron
  Forge + `@electron/packager` + native tooling do not support. The classic `node_modules` layout
  keeps the whole Electron toolchain working.
- **`npmMinimalAgeGate: 0`** — disables Yarn 4.16's new supply-chain "age gate", which defaults to
  **1440** minutes and *quarantines any package version published in the last 24 h*. With the gate on,
  `yarn install` failed with `electron@npm:^42.3.1: All versions … are quarantined`, directly blocking
  the owner's "use the very latest" requirement.
  - **Trade-off:** the age gate is a mitigation against freshly-published malicious releases. Disabling
    it means we may install day-0 versions. Acceptable here given the explicit "latest" requirement; if
    we later want a safety margin without blocking, set a smaller window (e.g. `60`) plus
    `npmPreapprovedPackages` for known-good deps.
- **`approvedGitRepositories: ["https://github.com/electron/node-gyp.git", "https://github.com/electron/*"]`**
  — Yarn 4.16 blocks git dependencies unless allowlisted. Forge pulls in `@electron/node-gyp` as a git
  dep (via `@electron/rebuild`), so its repo is allowlisted.
- **`enableScripts: true`** — Yarn 4.16 defaults this to `false` (won't run package build/postinstall
  scripts). With it off, **Electron's postinstall never downloads the Electron binary**
  (`node_modules/electron/dist` is empty) and `yarn start` / `yarn make` fail. Electron legitimately
  needs its postinstall, so scripts are enabled. (Could later be narrowed to per-package opt-in via
  `dependenciesMeta`.)

## Repo hygiene

`.gitignore` updated for Berry: ignore `.yarn/*` except `releases`/`plugins`/`patches`/`sdks`/`versions`,
ignore `.pnp.*`, and — importantly — ignore `.env` (the owner's `GITEA_TOKEN` lives there). Corepack
must be enabled on any machine that builds this repo (`corepack enable`).

## Lockfile

The Yarn 1 `yarn.lock` was removed and regenerated in Yarn 4 format.
