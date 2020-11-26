# Tasks

- Highlight selected item with an outline, so it's clear which one hitting `[ENTER]` affects.
- Add arrow-key navigation to select images for viewing.
- [ESCAPE] key un-highlights from view where as clicking re-highlights.
- Update number of images per row when screen width changes.

## Image Loader
- Ensure 4-image pipeline is respected.
- Create a single queue with states instead of multiple queues.
- Load images from directory rather than `Image`. This will make it easier to queue up images independent of React components.

## Build
- Create Docker container or use existing one to build.
	+ https://github.com/develar/electron-builder/blob/master/docker/node/Dockerfile
	+ https://hub.docker.com/r/electronuserland/builder/
	+ https://www.electron.build/multi-platform-build#docker

## Performance
- Stop loading images in `FileBrowser` until `ImageViewer` image is loaded.
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
- Add highlight around `selectedIndex` item in `VirtualizedList`.
- Handle situation where drive is inaccessible by either not rendering the drive, going back to the root, or displaying an error.
- Fix incorrect vertical and horizontal padding between `VirtualizedList` items. Vertical padding is overlapping and horizontal padding is leaving 1px gaps between items and cutting off a few px of the right-most item.
- When folders take forever to load a directory listing, there's no loading indicator. This causes `VirtualizedList` to scroll to the top of the current view making it seems as if the current view is the selected folder (which it's not).
- Fix issue where leaving a folder resets scroll. Maybe save all directories and scroll positions in context and set them to `0` only when it's a new folder. Should these be stored in localStorage along with an image cache?

## Image Viewer
- Add ability to zoom with mouse-wheel and pinch. This changes the functionality of clicking the center of an image.
- Make it so you can edit the URL with `history` pathing potentially using React-Router-DOM.
- Add highlight when hovering and clicking controls.
- Assign [ENTER] key as "return to `FileBrowser`".
- Fix hover state still getting stuck sometimes.
- Add the ability to delete images with `[DELETE]`. Make sure to implement a confirmation modal that responds to key commands. Right now, both `[ENTER]` and `[ESCAPE]` leave the `ImageViewer`. With this confirmation dialog, that should change to swapping `filePath` rather than leaving `ImageViewer`.

## Future
Potentially unnecessary additions.

### Key Commands
- Stop listening to `SHIFT` and `CTRL` when held for different commands like grabbing a screenshot.

### Directory List
- It would also probably be good to cache directory listings. Cache would include the parent directory and each subdirectory.
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
