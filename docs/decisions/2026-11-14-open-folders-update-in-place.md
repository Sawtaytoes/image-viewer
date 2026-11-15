# Open folders update in place

- **Status:** Accepted
- **Type:** Feature
- **Supersedes:** —
- **Superseded by:** —
- **Date:** 2026-11-14
- **Source:** Folder update feature request.

## Decision

Reconcile open galleries and image panes when their direct folder entries change.
Keep the folder's selected sort order, and preserve the displayed image by path
when another item is inserted ahead of it. If that image is removed, use the
nearest remaining index.

Mark additions after the initial successful listing with a green outline and a
visible New label. Keep those markers during the current folder visit; clear them
when leaving the folder. Initial contents are not new additions.

Use filesystem notifications for prompt updates and a three-second reconciliation
for missed notifications on network shares. Serialize reads, discard results after
navigation, and preserve the last successful listing through temporary read errors.

## Context

New files should appear without refreshing the app or leaving and reopening the
folder. An insertion must not change the image being read.

## Evidence

The feature request reports having to refresh the app or leave and reopen a
folder before additions appear, and asks for automatic sorting and a green
indicator. Implementation and verification are recorded in
[PR #60](https://github.com/Sawtaytoes/image-viewer/pull/60).
