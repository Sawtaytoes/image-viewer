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
