# [2.1.0](https://github.com/Sawtaytoes/image-viewer/compare/v2.0.2...v2.1.0) (2026-06-30)


### Bug Fixes

* **build:** emit one-word ImageViewer folder and executable names ([a37af79](https://github.com/Sawtaytoes/image-viewer/commit/a37af793c9275acec9a6a88f300027cd1c8bd535))
* **fileBrowser:** apply Source Sans Pro to sort toggle ([24ad223](https://github.com/Sawtaytoes/image-viewer/commit/24ad2238d172579282899dc97320590626b3869a))
* **viewer:** clear stuck nav-edge hover on window blur ([aaceaa2](https://github.com/Sawtaytoes/image-viewer/commit/aaceaa25819761a94415c6372860f67156c54046))


### Features

* **fileBrowser:** lazy folder thumbnails via in-view findFirstImage ([82290fb](https://github.com/Sawtaytoes/image-viewer/commit/82290fbe51ef59d10de27f9106616e8e66d2103d))
* **fileBrowser:** per-folder image-count badge ([81b553c](https://github.com/Sawtaytoes/image-viewer/commit/81b553caefc8312751f61ba47b653bbc7dc9ecc6))
* **fileBrowser:** show a loading spinner while a folder lists ([bb233ff](https://github.com/Sawtaytoes/image-viewer/commit/bb233ff866b111ede616a8c355dace7764cd4c03))
* **images:** HEIC/HEIF support via main-process JPEG transcode ([17a265f](https://github.com/Sawtaytoes/image-viewer/commit/17a265ff6a8709ab5190bf49613bfd9543a6eedd))
* **imageViewer:** delete the current image with [Delete] + confirmation ([1a6c27d](https://github.com/Sawtaytoes/image-viewer/commit/1a6c27d46a6c1cab43258ab2861cd68499349968))
* **imageViewer:** queue/gallery refinements + wheel nav (WIP) ([77a4e69](https://github.com/Sawtaytoes/image-viewer/commit/77a4e69ac1a542791e4a6384c67f80b777b6210a))
* **viewer:** cross-window resume-where-I-left-off per folder ([c840dde](https://github.com/Sawtaytoes/image-viewer/commit/c840dde1fec47a23c06aff9fd67c8e4774de9706))
* **viewer:** delete folders not images; auto-load next on empty ([b38e8f1](https://github.com/Sawtaytoes/image-viewer/commit/b38e8f18ddfcf1afa71e84b13c3388e7b056a6d5))
* **viewer:** pre-select and scroll to the next image on gallery open ([8b2e1ee](https://github.com/Sawtaytoes/image-viewer/commit/8b2e1ee3a3c4cffa1001b9e4760b120865a6f72f))
* **viewer:** resume position on every folder-open; auto-fill new columns ([19dbf38](https://github.com/Sawtaytoes/image-viewer/commit/19dbf382ad38ec18a6b3df9854915994fde9ca04))
* **viewer:** scale up the per-column menu; make folder-delete deliberate ([4c519da](https://github.com/Sawtaytoes/image-viewer/commit/4c519daf0dba6ca918eb4dc9d4d43957146cf83f))


### Reverts

* **viewer:** drop next-image gallery pre-select and scroll ([a02425e](https://github.com/Sawtaytoes/image-viewer/commit/a02425e225e8106d6434216b9bdd879d6d4da322))

## [2.0.2](https://github.com/Sawtaytoes/image-viewer/compare/v2.0.1...v2.0.2) (2026-06-19)


### Bug Fixes

* **fileBrowser:** restore instant folder listing by deferring mtime stats ([7e0f64a](https://github.com/Sawtaytoes/image-viewer/commit/7e0f64aeca2e71669e6ad5782b6b8f28a70cd3bb))

## [2.0.1](https://github.com/Sawtaytoes/image-viewer/compare/v2.0.0...v2.0.1) (2026-06-04)


### Bug Fixes

* **imageViewer:** suppress chrome reveal after a pane overlay closes ([d40e0f0](https://github.com/Sawtaytoes/image-viewer/commit/d40e0f07ae08dbdc4dcc039ab34d99413722aa89))

# [2.0.0](https://github.com/Sawtaytoes/image-viewer/compare/v1.1.0...v2.0.0) (2026-06-04)


* feat(settings)!: remember sort order per folder ([2ff84e3](https://github.com/Sawtaytoes/image-viewer/commit/2ff84e3abc8d3b06c3af85b312f3d8bd5ae0ab7c))


### Bug Fixes

* **imageLoader:** don't cancel in-flight downloads when a tile hides ([db704ab](https://github.com/Sawtaytoes/image-viewer/commit/db704ab77019116487b63ff12c83f908738f8705))
* **imageViewer:** don't reveal chrome when closing a pane's gallery ([2e9c9f0](https://github.com/Sawtaytoes/image-viewer/commit/2e9c9f0f0528e34c96ec0581c1b3df4676e3937a))
* **imageViewer:** stop fast double-tap from selecting the fullscreen image ([8e14f7a](https://github.com/Sawtaytoes/image-viewer/commit/8e14f7abcedce2adbbf8131a44f014d2f6042753))


### Features

* **workspace:** add a Clear queue button to the folder tab strip ([fcc6609](https://github.com/Sawtaytoes/image-viewer/commit/fcc6609691122c2c3dcbe81c1505a5fab25bb628))


### Performance Improvements

* **imageViewer:** keep gallery thumbnails a fixed size across panes ([8d2cc6b](https://github.com/Sawtaytoes/image-viewer/commit/8d2cc6b5d4d52d526b29620617c6bcbee79d52d9))


### BREAKING CHANGES

* the global `imageViewer.sortOrder` localStorage key is
replaced by a per-folder `imageViewer.sortOrdersByFolder` map. A previously
saved global sort preference is not migrated; folders start from the Name
default until re-toggled.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>

# [1.1.0](https://github.com/Sawtaytoes/image-viewer/compare/v1.0.0...v1.1.0) (2026-06-04)


### Bug Fixes

* **fileBrowser:** keep image cache across the sort toggle ([8262d5d](https://github.com/Sawtaytoes/image-viewer/commit/8262d5dbb7571967b0540bdaed7668da6650bc1a))
* **imageViewer:** no stray edge-hover on image open; unselectable column menu ([53589ab](https://github.com/Sawtaytoes/image-viewer/commit/53589ab6ca3f42a1d0f08c50bb0e18ff27c29799))


### Features

* **imageLoader:** refcount cached blobs so they evict on last release ([a1abb5c](https://github.com/Sawtaytoes/image-viewer/commit/a1abb5c8bd432edb7a4d3f1332111863b7ef9d0c))
* **imageViewer:** date-modified sort + Explorer-style grouping, plus edge fixes ([44c7fb4](https://github.com/Sawtaytoes/image-viewer/commit/44c7fb4249d5f5f3c070139f47f0a4b2ddff0597))
* **imageViewer:** open first folder on "Open N folders"; drop active outline; fixes ([8df853f](https://github.com/Sawtaytoes/image-viewer/commit/8df853f142f3ed9c877c5f054849d3b2afcc1867))
* **imageViewer:** side-by-side columns viewer with touch-summoned chrome ([adb2412](https://github.com/Sawtaytoes/image-viewer/commit/adb2412092efc8d12e51b22d2a1311969d0dab8f))
* **workspace:** folder queue via long-press multi-select + tab strip ([6a50744](https://github.com/Sawtaytoes/image-viewer/commit/6a50744c2b798ecfc79f9fc66588949d24d5ee51))

# 1.0.0 (2026-06-03)


### Bug Fixes

* **images:** read bytes via preload instead of safe-file-protocol ([8ed8831](https://github.com/Sawtaytoes/image-viewer/commit/8ed8831dc381863e26e0854e470b0170009541e3))
* **viewer:** fit images from intrinsic size to stop aspect-ratio drift ([9b8fb10](https://github.com/Sawtaytoes/image-viewer/commit/9b8fb105b205d7bddb9d95e44e5da389e42358be))


### Features

* configurable default start directory via IMAGE_VIEWER_DEFAULT_DIRECTORY ([1fd0d13](https://github.com/Sawtaytoes/image-viewer/commit/1fd0d1315699583817cad896f98070dd37f69678))
* **toolkit:** animate confirmation modal + add button interaction states ([9375a20](https://github.com/Sawtaytoes/image-viewer/commit/9375a209c8fcab83d9475da4499b10f35c8042f9))
