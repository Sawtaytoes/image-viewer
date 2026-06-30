# 2026-06-03 — Configurable default start directory

- **Status:** Locked
- **Date:** 2026-06-03
- **Deciders:** Kevin (owner) + agent
- **Source:** commit 1fd0d13; chat (495afc3e)

## Decision (the rule)

The default start directory is configurable via `IMAGE_VIEWER_DEFAULT_DIRECTORY` (resolved in main; dev via a project `.env`, with a committed `.env.example`). It falls back to the drive list when unset. Never hardcode a path.

## What was rejected ("no, that's wrong")

A hardcoded `D:\`; the temporary `D:\Pictures` renderer hack.

## Why

A hardcoded path only works on the owner's machine and leaks a personal directory into source. An env var keeps it configurable with a sane fallback.

## How to honor it

Read `IMAGE_VIEWER_DEFAULT_DIRECTORY` in main; fall back to the drive list when unset; keep `.env.example` committed.

## Evidence

commit 1fd0d13; chat (495afc3e) — replaced hardcoded `D:\` / `D:\Pictures` with the env var.
