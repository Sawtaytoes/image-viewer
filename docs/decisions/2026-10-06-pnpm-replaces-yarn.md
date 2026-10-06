# pnpm replaces Yarn

- **Status:** Accepted
- **Date:** 2026-10-06
- **Type:** Tooling
- **Supersedes:** [Use Yarn, never npm](2026-05-08-use-yarn-never-npm.md) and [Yarn node-modules linker](2026-06-02-yarn4-nodelinker-node-modules.md), package-manager choice only.
- **Superseded by:** —

## Decision

Use pinned pnpm 12.9.1 for dependency installation and task execution. Preserve existing manifest ranges, resolved dependency versions, security patches and dependency lifecycle behavior. Use a frozen lockfile in CI. A pinned `npm install --global --force --allow-scripts=pnpm pnpm@12.9.1` is allowed to bootstrap pnpm; application commands use pnpm.

Electron Forge requires `nodeLinker: hoisted` in pnpm-workspace.yaml so packaging can collect a physical node_modules tree. Preserve that requirement.

## Context

The owner approved migration after repeated frozen-install benchmarks against Yarn and tuned Yarn. This supersedes the prior Yarn standard; it does not authorize unrelated dependency upgrades or remove existing test/build/browser gates.

## Why

The repeated-install benchmarks supported switching package managers. Consistent commands, pinned tooling and unchanged package versions make the migration reviewable.

## Evidence

Owner, T3 Code thread `b060b3db-e4bd-4636-894b-98e8f108849d`, 2026-10-06:

> “OMG, let's get this transition done!”

The cross-cutting workspace decision is `agentic/docs/decisions/2026-10-06-pnpm-replaces-yarn-for-owned-node-repositories.md`. Benchmark artifacts: `/data/plain/t3/benchmarks/optimization-20261005/report.html` and `results.csv`.
