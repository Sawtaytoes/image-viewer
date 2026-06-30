# 2026-06-04 — Up-arrow navigates up, not the dropdown

- **Status:** Locked
- **Date:** 2026-06-04
- **Deciders:** Kevin (owner) + agent
- **Source:** chat (67645b4d)

## Decision (the rule)

The up-arrow in the directory controls navigates UP one folder. It must NOT open the pull-down/dropdown menu.

## What was rejected ("no, that's wrong")

Wiring the up-arrow to open the pull-down/dropdown menu instead of moving to the parent directory.

## Why

The control is meant for navigation. Bringing down the pull-down menu strands the user instead of letting them go up a folder.

## How to honor it

Keep the up-arrow handler bound to "go to parent directory." Do not repurpose it to toggle the dropdown.

## Evidence

"It doesn't go up a folder, it brings down the pull-down menu... It should go up a folder, not show the pull-down menu." — chat (67645b4d)
