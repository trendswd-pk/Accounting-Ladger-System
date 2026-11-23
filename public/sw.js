/* Minimal service worker — required for installable PWA on Chromium.
 * Network-only; never let a failed fetch reject the FetchEvent. */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  // Never intercept Digital Asset Links / well-known — Chrome and Android
  // verify TWA / App Links against these URLs outside the page SW path, but
  // a failed catch-all fetch would still risk odd offline/503 behavior.
  if (url.pathname.startsWith('/.well-known/')) {
    return
  }

  // Pass through; swallow network/abort errors so the page isn't broken.
  event.respondWith(
    fetch(event.request).catch(() =>
      new Response('', {
        status: 503,
        statusText: 'Offline',
        headers: { 'Cache-Control': 'no-store' },
      })
    )
  )
})
