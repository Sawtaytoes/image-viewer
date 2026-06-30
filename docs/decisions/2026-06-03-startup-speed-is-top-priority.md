# 2026-06-03 — Startup speed is top priority

- **Status:** Locked
- **Date:** 2026-06-03
- **Deciders:** Kevin (owner) + agent
- **Source:** chat (870e2aa9)

## Decision (the rule)

Startup speed is the #1 priority. Don't add anything that regresses cold start.

## What was rejected ("no, that's wrong")

Changes that slow startup for the sake of features or convenience.

## Why

The original app "takes forever to load" was the main motivation for building this one. A slow cold start defeats the purpose.

## How to honor it

Lazy-load the image pipeline; keep startup lean. The `wmic` removal was a first down-payment on this.

## Evidence

"startup speed is very important." — chat (870e2aa9)
