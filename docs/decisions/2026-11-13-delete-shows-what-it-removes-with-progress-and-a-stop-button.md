# 2026-11-13 — Delete shows what it removes, with progress and a Stop button

- **Status:** Locked
- **Date:** 2026-11-13
- **Deciders:** Kevin (owner) + agent
- **Source:** owner correction to a code audit finding, in chat, 2026-11-13

## Decision (the rule)

Keep the permanent-delete fallback when the trash is unavailable, and never add a second
confirmation for it. Before a delete, the confirmation names every item and says what each
holds: files, folders, and the total size, counted while counting is cheap. While a delete runs,
show its progress (items done out of total, entries removed out of total, and the entry being
removed now) and a Stop button. Stop halts the remaining work, and the dialog says plainly that
it cannot undo what is already removed. When the delete ends, report each item and how it went:
moved to the Recycle Bin, deleted permanently, stopped partway, untouched, or failed.

## What was rejected ("no, that's wrong")

- **Treating the permanent fallback as a bug.** A code audit flagged `src/main.js`, where a failed
  trash falls back to `fs.rm` and still reports success. The owner said the fallback is
  intentional: delete means delete, the Recycle Bin is used when there is one, and storage
  snapshots are the safety net. Do not remove the fallback, and do not add a second
  "are you sure, this is permanent?" question for it.
- **A delete with no feedback.** The confirmation said only "Are you sure you want to delete this
  file or directory?", with no name, count, or size. After "Yes", the dialog stayed on screen with
  nothing changing until the whole delete finished, and nothing reported how each item went.
- **One opaque recursive call.** The fallback ran `fs.promises.rm(path, { recursive: true })` as a
  single call. It could not report progress and could not stop, so a large folder on a network
  share, where the trash always refuses and every removal waits on the network, looked like a
  frozen app for as long as it took.

## Why

The owner's words: "From my perspective, a delete basically freezes the app with no indication
as to what's happening." What he wants is to see what will be removed before it goes, to watch it
go, and to stop it if he made a mistake.

The investigation found the work itself never blocked the main process: `shell.trashItem` and
`fs.promises.rm` both return promises. The freeze was the interface. The question stayed up and
showed nothing, a second "Yes" could start the same delete again, and the one recursive call gave
the app nothing to show. Large folders on network shares are where it hurt most, because there the
trash refuses every item and the permanent delete runs file by file over the network. That could
not be reproduced on a Windows share from the build sandbox. The sandbox measured a local disk:
the new dialog painted every frame (the longest gap was 17 ms) while 102,106 entries were deleted,
and Stop left the 81,964 files that had not been reached.

## How to honor it

- The delete job is `src/deleting/deleteItems.ts`. It is pure and reaches the disk only through
  a `DeleteFileSystem`, so the main process (`nodeDeleteFileSystem.ts`), the preload's fake
  filesystem, and the browser build all run the same code. Each item goes to `shell.trashItem`
  first. When the trash refuses it, the job lists the folder and removes it one entry at a time,
  four at once, checking Stop before each one. It never follows a link out of the folder.
- Stop cannot interrupt a trash call that is already running, because the OS offers no way to do
  that. A trash that fails after Stop must not fall through to the permanent delete.
- Main checks every target: an absolute path, and never a drive or filesystem root.
- The channels are `delete:summarize` and `delete:start` (invoke), `delete:stop` (send), and
  `delete:progress` (main to the window, with the job id). `deleteFilePath` keeps its contract
  for any other caller.
- Every delete button asks `DeleteItemsProvider` (`src/components/deleting/`) through
  `requestDelete(targets)`. Do not give a screen its own confirmation modal again. The provider
  sits above every screen, so the dialog survives a popover or toolbar that closes.
- The confirmation keeps the 2026-06-03 guards: [Enter] answers yes, [Escape], [Backspace], and an
  outside press answer no, and the two buttons sit at opposite ends. Stop sits where "No" was. A
  running delete cannot be dismissed by Escape or an outside press. Stop is the way out.
- To see the progress in the fake filesystem, slow it down: `IMAGE_VIEWER_FAKE_DELETE_DELAY_MS`
  and `IMAGE_VIEWER_FAKE_TRASH_UNAVAILABLE` under Electron, or
  `?fakeDeleteDelayMs=700&fakeTrashUnavailable=1` in the browser build.

## Evidence

"this is intentional. Unless I'm not understanding. Delete means delete. If you have a recycle bin,
you do. If not, it's good. Thank goodness for snapshots. The one thing that would be good is a
message saying what will be removed (no indication), progress indicator, and stop/cancel button for
if you make a mistake. From my perspective, a delete basically freezes the app with no indication
as to what's happening." — the owner, 2026-11-13, in reply to the 2026-11-12 fleet code audit.

## Related

- [[2020-11-28-delete-to-recycle-bin-via-electron-shell]] — the trash-then-permanent rule this
  keeps. The permanent step is now file by file instead of one `fs.rm` call.
- [[2026-06-03-delete-needs-confirmation-and-guards-stray-delete-key]] — the confirmation and
  its keyboard guards, which this extends with names, counts, and size.
- [[2026-06-30-multiview-has-delete-and-selection-affordances]] — the viewer's folder delete,
  which now uses the same dialog.
- [[2026-06-03-ui-needs-visible-feedback]]
