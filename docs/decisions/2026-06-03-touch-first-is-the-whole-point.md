# 2026-06-03 — Touch-first is the whole point

- **Status:** Locked
- **Date:** 2026-06-03
- **Deciders:** Kevin (owner) + agent
- **Source:** chat (sessions 84c45e1e, 9c71b228)

## Decision (the rule)

This app is touch-first. Every interaction must be touch-friendly; never trade touch usability for keyboard/mouse convenience.

## What was rejected ("no, that's wrong")

Building UI without prioritizing touch ergonomics — designing for mouse/keyboard first and treating touch as an afterthought.

## Why

Touch is the primary way the owner uses the viewer. If it isn't touch-friendly, the app loses its reason to exist.

## How to honor it

Treat gestures (press-and-hold, swipe, tap zones) as first-class. Prefer pointer/touch handlers over hover-only behaviors.

## Evidence

"I use this image viewer primarily with touch; otherwise, I wouldn't have built it." — chat (84c45e1e, 9c71b228)
