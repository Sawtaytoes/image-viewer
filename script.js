const fs = require('fs')
const path = require('path')
const yargs = require('yargs')
const { bindNodeCallback, from, fromEvent } = require('rxjs')
const { map, mergeMap, tap } = require('rxjs/operators')
const { remote } = require('electron')

// let isFocused = true
// setInterval(() => {
// 	if (!isFocused) {
// 		window.location = window.location.href
// 	}
// }, 5000)
// window.addEventListener('focus', () => { isFocused = true })
// window.addEventListener('blur', () => { isFocused = false })

const getThumbnailCanvas = (original, canvasWidth) => {
  const canvas = document.createElement("canvas");

  canvas.width = canvasWidth;
  canvas.height = original.height / original.width * canvasWidth;

  canvas.getContext("2d").drawImage(original, 0, 0, canvas.width, canvas.height);

  return canvas
}

const loadImages = (
	filesList,
) => {
	const imageGalleryDomElement = (
		document
		.querySelector('#imageGallery')
	)

	const imageWidth = Math.floor((imageGalleryDomElement.clientWidth - 16) / 4)

	from(filesList)
	.pipe(
		map((
			path,
		) => {
			const imgDomElement = document.createElement('img')

			imgDomElement.src = path
			imgDomElement.style = `display: block; width: ${imageWidth}px`

			return imgDomElement
		}),
		tap((
			imgDomElement,
		) => (
			imageGalleryDomElement
			.appendChild(
				imgDomElement
			)
		)),
		mergeMap((
			imgDomElement
		) => (
			fromEvent(
				imgDomElement,
				'load'
			)
			.pipe(
				map(() => ({
					imgDomElement,
					thumbnailDomElement: getThumbnailCanvas(imgDomElement, imageWidth)
				})),
			)
		)),
		tap(({
			imgDomElement,
			thumbnailDomElement,
		} ) => (
			imageGalleryDomElement
			.replaceChild(
				thumbnailDomElement,
				imgDomElement,
			)
		)),
	)
	.subscribe()
}

const getFileListObserver = (
	filePath,
) => (
	bindNodeCallback(
		fs
		.readdir
		.bind(fs)
	)(
		filePath
	)
	.subscribe(fileNames => (
		loadImages(
			fileNames
			.map((
				fileName,
			) => (
				path
				.join(
					filePath,
					fileName,
				)
			))
		)
	))
)

getFileListObserver(
	(
		yargs(
			remote
			.getGlobal('processArgs')
		)
		.argv
		.filePath
	)
	|| './'
)
// ------------

const store = {}

document.addEventListener('drop', (event) => {
	event.preventDefault();
	event.stopPropagation();

	store.files = event.dataTransfer.files

	console.log(event.dataTransfer.files)

	loadImages(
		Array.from(event.dataTransfer.files)
		.map(({
			path,
		}) => (
			path
		))
	)
});

document.addEventListener('dragover', (event) => {
	event.preventDefault();
	event.stopPropagation();
});