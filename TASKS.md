# Tasks

- [ESCAPE] key un-highlights from view where as clicking re-highlights.
- Create custom scrollbar overlay to prevent shaky resize when scrollbar appears and disappears.
- Figure out why opening a second instance in `ImageViewer` causes it to only show a white screen. This is most-likely because the `isVisible` flag isn't set correctly.
- "Are you sure?" Modal confirmation dialog. Used for file or folder deletion.
- Figure out multi-window not loading. This is noticeable when using the executable.
- Fix hover issue (active?) when clicking image viewer navigation.
- Keyboard keys screen state provider so each keyboard component can enable or disable keys based on a screen state.
- Load Google Fonts locally rather than from the web to speed up multiple instances.

## Image Loader
- Ensure 4-image pipeline is respected.
- Create a single queue with states instead of multiple queues.
- Load images from directory rather than `Image`. This will make it easier to queue up images independent of React components.

## Performance
- Stop loading images in `FileBrowser` until `ImageViewer` image is loaded. This is somewhat solved, but it requires a high-priority and low-priority queue state.
- Fix memory leak associated with loading and unloading folders containing images. They're probably getting stored somewhere other than state.

## File Browser
- List number of images in each directory.
- Stylize progress bar for image loading.
- Add a slider to switch between different numbers of image thumbnails per row.
- Add way to sort by last modified date rather than only alphabetical.
- Store file sorting state in local storage.
- Add highlight when hovering and clicking controls.
- Add highlight when hovering and clicking images and folders.
- Add confirmation modal to folder deletion. Set [ENTER] to be "yes".
- Unhide folder deletion icon.
- Handle situation where drive is inaccessible because either it's disconnected or this user doesn't have permissions. By either not rendering the drive, going back to the root, or displaying an error.
- When folders take forever to load a directory listing, there's no loading indicator. This causes `VirtualizedList` to scroll to the top of the current view making it seems as if the current view is the selected folder (which it's not).
- Show `filePath` as the window title.
- Show a message as to which file or folder is being deleted.
- Rename all Directory to Folder.

## Image Viewer
- Add ability to zoom with mouse-wheel and pinch. This changes the functionality of clicking the center of an image.
- Make it so you can edit the URL with `history` pathing potentially using React-Router-DOM.
- Add highlight when hovering and clicking controls.
- Fix hover state still getting stuck sometimes.
- Add the ability to delete images with `[DELETE]`. Make sure to implement a confirmation modal that responds to key commands. Right now, both `[ENTER]` and `[ESCAPE]` leave the `ImageViewer`. With this confirmation dialog, that should change to swapping `filePath` rather than leaving `ImageViewer`.
- Switch back to `canvas` when viewing images as it's significantly higher quality.

## Future
Potentially unnecessary additions.

### Directory List
- It would probably be good to cache directory listings. Cache would include the parent directory and each subdirectory.
- When loading a new directory, it will still list the files, but first use the cache SWR style.

### Image Thumbnail Storage
- Store thumbnails somewhere and allow them to be named by the image hash and the date.
- What size thumbnail gets stored? Most times, the size is dependent on the user settings and browser size.
- Put together cache purging.
	+ Happens after X time has passed.
	+ Happens after max size reached.
	+ After user changes thumbnail size?
- Remove `src` from `img` element when `canvas` loaded to save on memory so not all full-sized images are stored in RAM. Make sure there's a parent canvas element or something similar that has a large enough thumbnail, so we're not using images from memory when recomputing the `canvas` on resize.
- Cache
	+ Capture total machine memory and use up to a percentage of RAM for cached image elements.
	+ Deletion priority starts with last viewed time. Viewing recent images resets the timer.
	+ Set images in cache on a debounce timer, so they remove by themselves.

### Multi-threading
- Add second thread for loading images and predictive loading of other images asynchronously.
