# 2026-08-08 — On personal GitHub, release bots and “green CI before merge” cannot both be hard gates

- **Status:** Locked
- **Date:** 2026-08-08
- **Deciders:** Kevin (owner) + agent
- **Source:** chat — Master ruleset blocked `semantic-release` push after #17; PAT rejected; ruleset stripped to linear history

## Decision (the rule)

**This repo stays on a personal GitHub account.** The Master ruleset keeps **linear history only** — no “require pull request”, no “require status check `ci`”, no bypass list for Actions.

CI still **runs** on PRs and on `master`. Agents and humans should still treat green CI as the merge bar. The **platform does not enforce** it.

Do **not** reintroduce a full no-bypass Master ruleset (PR + required `ci`) while releases push version bumps with `GITHUB_TOKEN`. That combination **fails** on a personal account.

## What was rejected ("no, that's wrong")

1. **Requiring a long-lived admin PAT (`RELEASE_TOKEN`)** so Release can push past the ruleset. Owner: never needed that before; remove the restriction instead.
2. **Adding GitHub Actions (integration id 15368) as a ruleset bypass actor** on a personal repo. API rejects it:
   `Actor GitHub Actions integration must be part of the ruleset source or owner organization`.
3. **Keeping require-PR + require-`ci` with empty `bypass_actors`.** That is what broke Release after #17: `@semantic-release/git` got GH013 (“Changes must be made through a pull request” / “Required status check `ci` is expected”) when pushing the version-bump commit to `master`.

## Why

Personal-account rulesets cannot list the built-in GitHub Actions app as a bypass. Anything that must push **directly** to the default branch as `github-actions[bot]` (here: `semantic-release` via `.github/workflows/release.yml`) is refused if the ruleset demands PRs and status checks with no bypass.

Trade-off (accepted until a bigger move):

> CI still runs, but nothing enforces “green before merge” on the default branch. If you ever want that **and** automated releases without a PAT, the durable path is moving these under a **GitHub org** so Actions can be a real bypass actor.

Org migration is a large, deferred change — not blocked, not scheduled here.

## How to honor it

- Master ruleset on `Sawtaytoes/image-viewer` (id historically `20444657`): **`required_linear_history` only.** Do not add `pull_request` or `required_status_checks` without a new decision that also solves Release (org move or an accepted release-token design).
- Leave Release on `secrets.GITHUB_TOKEN` (no `RELEASE_TOKEN` requirement).
- Still run `yarn test` / `yarn typecheck` / `yarn lint` / PR CI before merging; the ruleset just does not refuse a merge if someone skips that.
- Same personal-account collision hit the sibling GitHub fleet repos that shared the full Master ruleset pattern (`charcuterie`, `mux-magic`, `castkit` at minimum). Fleet paper trail (separate repo):
  `agentic/docs/decisions/2026-08-05-master-merges-gate-on-ci-via-no-bypass-rulesets.md` (2026-08-08 update).

## Evidence

“Never needed to [create a PAT] before. Just remove the restriction if that's the requirement.” — chat (2026-08-08)

“I'll have to look into [a GitHub org] some other time because it's a big change.” — chat (2026-08-08), documenting the deferred durable path

## Related

- [[2026-08-08-escape-exits-fullscreen-before-closing-viewer]] — the fix whose post-merge Release first hit GH013
- [[2026-06-04-windows-release-runs-on-github-only]] — Release is GitHub-only; that job must be able to push to `master`
- Fleet (agentic repo): `docs/decisions/2026-08-05-master-merges-gate-on-ci-via-no-bypass-rulesets.md` (original intent + 2026-08-08 personal-account exception)
