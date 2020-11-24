# Tasks

## Image Loader
- Setup `img` DOM element after getting blob instead of passing around the blob.
- Ensure 4-image pipeline is respected.
- Create custom hook similar to `useSelector` for creating side-effects from state updates. Possibly have it be named `useStateEffect`.
- Create a single queue with states instead of multiple queues.
- Load images from directory rather than `Image`. This will make it easier to queue up images independent of React components.
- Loading an image and unmounting it calls `unloadImage`; although, the image is still loaded as a thumbnail. There's no way to claim an image. This is why it's important to separate filePaths from React components.
- Progress bar displaying when viewing `ImageViewer` images. This happens because it defaults to `0` then loads the correct percentage from state.
- Reset download percentage on abort.
- Fix bug where `isVisible` set `true` for clicked image, but immediately set to `false` when intersectionObserver runs.

## Build
- Create Docker container or use existing one to build.
	+ https://github.com/develar/electron-builder/blob/master/docker/node/Dockerfile
	+ https://hub.docker.com/r/electronuserland/builder/
	+ https://www.electron.build/multi-platform-build#docker

## Performance
- Create way to have a finite number of download slots and only begin downloading when slots are available. Will most-likely require a separate context provider.
- Add list virtualization so canvas elements might be loaded in memory but aren't loaded in the DOM. This will greatly speed up performance when loading hundreds of images.
- Re-use images from `ImageFile` in `ImageViewer`.
- Prioritize starting images.
- Eventually download all non-visible images after visible images downloaded.
- Stop loading images in `FileBrowser` until `ImageViewer` image is loaded.
- Fix memory leak associated with loading and unloading folders containing images. They're probably getting stored somewhere other than state.

## File Browser
- List number of images in each directory.
- Add cover image or 4-image thumbnails to directory listing.
- Stylize progress bar for image loading.
- Add a slider to switch between different numbers of image thumbnails per row.
- Add way to sort by last modified date rather than only alphabetical.
- Store file sorting state in local storage.
- Add highlight when hovering and clicking controls.
- Scroll to top on folder change.
- Add ability to delete folder.

## Image Viewer
- Add ability to zoom with mouse-wheel and pinch.
- Add visual indicator when at final page other than removing "next" and "previous" buttons.
- Make it so you can edit the URL with `history` pathing potentially using React-Router-DOM.
- Scroll image into view behind the selected image on close. Currently, this is being hacked in and needs a real implementation.
- Fix issue where image covers controls.
- Loading indicator doesn't show when switching images if images aren't already loaded.
- Add highlight when hovering and clicking controls.
- Add ability to delete folder.
- Fix issue where height calculation can result in infinite resize when scrollbar is added and removed infinitely at a specific window height.

## Future
Potentially unnecessary additions.

### Key Commands
- Stop listening to `SHIFT` and `CTRL` when held for different commands like grabbing a screenshot.

### Image Thumbnail Storage
- Store thumbnails somewhere and allow them to be named by the image hash and the date.
- What size thumbnail gets stored? Most times, the size is dependent on the user settings and browser size.
- Put together cache purging.
	+ Happens after X time has passed.
	+ Happens after max size reached.
	+ After user changes thumbnail size?
- Remove `src` from `img` element when `canvas` loaded to save on memory so not all full-sized images are stored in RAM. Make sure there's a parent canvas element or something similar that has a large enough thumbnail so we're not using images from memory when recomputing the `canvas` on resize.
- Cache
	+ Capture total machine memory and use up to a percentage of RAM for cached image elements.
	+ Deletion priority starts with last viewed time. Viewing recent images resets the timer.
	+ Set images in cache on a debounce timer, so they remove by themselves.


### Multi-threading
- Add second thread for loading images and predictive loading of other images asynchronously.
- Set `FileBrowser` to `visibility: hidden` when showing `ImageViewer`. We might still want to load images in the background though.
