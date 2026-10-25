# Browser compatibility

Modern browsers use the Firebase v12 module in `index.html` and retain all
authentication, upload, edit, realtime-update, and viewing features.

Browsers that do not support JavaScript modules, including Safari on iOS 9,
load `legacy-viewer.js` through the `nomodule` attribute. This ES5-only viewer
reads the public `materials` collection through the Firestore REST API and
supports:

- viewing the image list;
- inclusive and exclusive tag filtering;
- choosing from the registered tag list;
- switching between date and saved custom order; and
- enlarging an image card.

Both modern and legacy viewers support the slideshow button to the left of
the landscape-view button. It automatically scrolls the current filtered list
from the current position toward the bottom, preserving the selected order
and image size. Small cards scroll together as a grid; large cards scroll
through their full height. The array is not reversed.

The upper menu's 「画像のみ表示」 checkbox hides image-card tags, editing
controls, backgrounds, borders, and shadows, and displays images at their
natural aspect ratio. The upper menu remains available, including tag search
and exclusion filters. Filtering and slideshows continue to use the current
display mode. Uncheck the box to restore the normal cards; the filter and
image-size selections are preserved. This also works in the legacy viewer.

Speed can be changed during playback: slow (20 pixels/second), standard
(40 pixels/second), or fast (80 pixels/second). The same button or Escape stops
playback. Playback also stops at the bottom, when filtering leaves no images,
or when the browser tab becomes hidden. It does not loop. The playback controls
remain in their original position in the upper toolbar during playback.
The modern portrait landscape fallback
scrolls its rotated app container instead of the document.

For regression checks, serve this directory with
`python3 -m http.server 8000 --bind 127.0.0.1`, then run
`node tests/slideshow.cjs` with Playwright installed and Chromium available at
`/usr/bin/chromium` (or set `CHROMIUM_PATH`). The test uses mocked Firebase
responses, makes no production writes, and covers desktop, mobile, rotated
landscape, filtering, speed changes, stopping, end of list, and the legacy viewer.

The legacy path is intentionally read-only. It does not provide Google login,
uploads, tag editing, deletion, manual ordering, fullscreen/orientation lock,
or realtime updates. Refresh the page to retrieve later Firestore changes.

The fallback depends on the existing Firestore rule which allows public reads
of `materials`. Keep write access restricted to the administrator.
