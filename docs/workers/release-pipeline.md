# Worker brief: CI release pipeline (downloadable EXE on Gitea + GitHub Releases)

- **Priority:** FUTURE (owner: "Might be something worth doing in the future. Mark it as a future plan.")
- **Goal:** pushing a version tag builds the Windows app and publishes a **downloadable installer/EXE**
  to **Releases** on both GitHub and the self-hosted Gitea — so the owner can grab the build without
  running `yarn make` locally.

## What we already have

- `yarn make` (Electron Forge) produces Windows artifacts under `out/make/`:
  a **Squirrel** installer (`*-Setup.exe` + `.nupkg` + `RELEASES`) and a `.zip` (see makers in
  [`forge.config.ts`](../../forge.config.ts)). `yarn package` produces the raw runnable
  `out/Image Viewer-win32-x64/Image Viewer.exe`.
- Electron Forge has a **publish** step (`electron-forge publish`) + publishers.

## Recommended approach

**Versioning:** bump `version` in `package.json`, commit, tag `vX.Y.Z`, push the tag → CI fires.

**GitHub Releases** — easiest, official:
- Add `@electron-forge/publisher-github` to `forge.config.ts` (repo `Sawtaytoes/image-viewer`).
- GitHub Actions workflow `.github/workflows/release.yml`, trigger `on: push: tags: ['v*']`,
  runner `windows-latest`:
  ```yaml
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: 24 }
    - run: corepack enable
    - run: yarn install --immutable
    - run: node node_modules/electron/install.js   # Yarn 4 enableScripts caveat — see research/0008
    - run: yarn make
    - run: yarn publish        # uses publisher-github; needs GITHUB_TOKEN
      env: { GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }} }
  ```

**Gitea Releases** — no official Forge publisher, two options:
1. **Gitea Actions** (GitHub-Actions-compatible) with a self-hosted **Windows `act_runner`** registered
   on `gitea.octen.dev` (the owner self-hosts; a Windows runner is required to build a Windows app).
   Workflow mirrors the above but, instead of `yarn publish`, uploads `out/make/**` to a Gitea release
   via the **Gitea Releases API**:
   - `POST /api/v1/repos/sawtaytoes/image-viewer/releases` (create release for the tag),
   - `POST /api/v1/repos/.../releases/{id}/assets?name=...` (attach each artifact),
     authenticated with a token that has `write:repository` (the existing `GITEA_TOKEN` works for this;
     see [memory] / [research/0008](../research/0008-package-manager-yarn4.md)).
2. Or run the same upload step from the **GitHub** workflow (cross-publish to Gitea) so only one runner
   is needed — curl the Gitea API with a `GITEA_TOKEN` secret.

## Gotchas to plan for

- **Yarn 4 + scripts:** CI must enable Corepack and ensure Electron's binary is fetched
  (`enableScripts: true` is set in `.yarnrc.yml`, but a belt-and-suspenders `node node_modules/electron/install.js`
  avoids the "binary missing" issue we hit locally — see [research/0008](../research/0008-package-manager-yarn4.md)).
- **Code signing:** the Windows installer will be **unsigned** → SmartScreen "unknown publisher"
  warnings. Real signing needs a code-signing cert (paid). Acceptable for personal use; note it.
- **Windows runner for Gitea:** Gitea Actions needs a registered runner; GitHub provides `windows-latest`
  free for public repos (the Gitea repo is now public; the GitHub repo `Sawtaytoes/image-viewer` is public too).
- Keep secrets out of the repo (`.env` is git-ignored). Use Actions secrets for `GITEA_TOKEN`.

## Done when

A pushed `vX.Y.Z` tag yields a GitHub Release **and** a Gitea Release, each with the Squirrel
`*-Setup.exe` (and zip) attached and downloadable. Add this to [../roadmap.md](../roadmap.md) once shipped.
