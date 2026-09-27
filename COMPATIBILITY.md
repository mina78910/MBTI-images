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

The legacy path is intentionally read-only. It does not provide Google login,
uploads, tag editing, deletion, manual ordering, fullscreen/orientation lock,
or realtime updates. Refresh the page to retrieve later Firestore changes.

The fallback depends on the existing Firestore rule which allows public reads
of `materials`. Keep write access restricted to the administrator.
