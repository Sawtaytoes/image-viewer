- Prioritize starting images.
- Add fixed-size for columns, row-height, and gap.
- Stop loading images in gallery when showing `ImageView`.
- Fix slowness when going up a directory. Possibly prevent clicks on "Up Directory" until it's done processing and show a loading indicator.
- Add touch swipe support.
- Add ability to zoom with mouse-wheel and pinch.
- Add visual indicator when at final page other than removing "next" and "previous" buttons.
- Make it so you can edit the URL with `history` pathing potentially using React-Router-DOM.
- List number of images in each directory.
- Allow ability to cancel loading of directory if it's too slow to load. Right now, this freezes up the process.
- Add 4-image thumbnails to directory listing.
- Image Thumbnail Storage
	+ Store thumbnails somewhere and allow them to be named by the image hash and the date.
	+ What size thumbnail gets stored? Most times, the size is dependent on the user settings and browser size.
	+ Put together cache purging.
		* Happens after X time has passed.
		* Happens after max size reached.
		* After user changes thumbnail size?
- Multi-threading
	+ Add second thread for loading images and predictive loading of other images asynchronously.
	+ Set `FileBrowser` to `visibility: hidden` when showing `ImageViewer`. We might still want to load images in the background though.
- Resize image thumbnails after `window` resize event.
- Remove `src` from `img` element when `canvas` loaded to save on memory so not all full-sized images are stored in RAM. Make sure there's a parent canvas element or something similar that has a large enough thumbnail so we're not using images from memory when recomputing the `canvas` on resize.
- Show progress loader when images loading, so it's not simply blank. For now, this could be a loading indicator.
- Size thumbnails in `FileBrowser` to a fixed height and width based on the number of items and the number of thumbnails.
- Add a slider to switch between different numbers of image thumbnails per row.
