# EchoSift Chrome Extension

Manifest V3 Chrome extension for analyzing reviews on supported product pages through the EchoSift backend.

## Supported Pages

- Product Hunt: `https://www.producthunt.com/products/*`
- App Store: `https://apps.apple.com/*/app/*`
- Google Play: `https://play.google.com/store/apps/details*`

Product Hunt `/posts/*` pages are intentionally ignored in the first version.

## Development

```bash
cd extension
npm install
npm run dev
```

Load the development extension from:

```txt
extension/build/chrome-mv3-dev
```

## Production Build

```bash
cd extension
npm run build
npm run package
```

Load the production extension from:

```txt
extension/build/chrome-mv3-prod
```

## Chrome Debugging

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Select Load unpacked.
4. Choose the generated build directory.
5. Open a supported product page and verify the floating `✨ 一键分析评论` button.
6. Click the button and inspect the extension service worker to confirm the request to `/api/analyze`.
7. Click again while the first analysis is still running and confirm the service worker shares the in-flight request instead of starting a duplicate backend call.
8. Click again after a successful response and confirm the same page returns from the extension cache.

## Performance Behavior

- The content script listens to history, popstate, hashchange, focus, pageshow, visibilitychange, and a short click-debounced fallback to detect SPA route changes. It no longer observes the whole page body or polls every 500ms.
- The background service worker normalizes the URL plus language before analysis, so duplicate clicks on the same page share one in-flight request.
- Successful analysis responses are cached in `chrome.storage.session` with an in-memory fallback.
- Failed analysis responses are not cached.
- Requests time out after 90 seconds by default and show a clear timeout message in the modal.

Optional build-time overrides:

```bash
PLASMO_PUBLIC_ANALYSIS_TIMEOUT_MS=90000 \
PLASMO_PUBLIC_ANALYSIS_CACHE_TTL_MS=1800000 \
npm run build
```

## API Base URL

The extension defaults to:

```txt
https://echosift.online
```

Override it during development or build with:

```bash
PLASMO_PUBLIC_API_BASE_URL=https://your-domain.example npm run build
```
