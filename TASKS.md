# Tasks

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

## FileBrowser
- List number of images in each directory.
- Add cover image or 4-image thumbnails to directory listing.
- Stylize progress bar for image loading.
- Add a slider to switch between different numbers of image thumbnails per row.
- Add way to sort by last modified date rather than only alphabetical.
- Store file sorting state in local storage.

## Image Viewer
- Add ability to zoom with mouse-wheel and pinch.
- Add visual indicator when at final page other than removing "next" and "previous" buttons.
- Make it so you can edit the URL with `history` pathing potentially using React-Router-DOM.
- Scroll image into view behind the selected image on close. Currently, this is being hacked in and needs a real implementation.
- Fix issue where image covers controls.
- Fix residual navigation overlays on touch.
- Loading indicator doesn't show when switching images.

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

### Multi-threading
- Add second thread for loading images and predictive loading of other images asynchronously.
- Set `FileBrowser` to `visibility: hidden` when showing `ImageViewer`. We might still want to load images in the background though.
