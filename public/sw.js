const CACHE_NAME = "resonance-v2"
const STATIC_CACHE = "resonance-static-v2"
const DYNAMIC_CACHE = "resonance-dynamic-v2"

const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-192-maskable.png",
  "/icon-512-maskable.png",
]

// Install event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  )
})

// Activate event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              return caches.delete(cacheName)
            }
          }),
        )
      })
      .then(() => self.clients.claim()),
  )
})

// Fetch event
self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle GET
  if (request.method !== "GET") {
    return
  }

  // Bypass Next.js internals and hashed assets completely
  if (url.pathname.startsWith("/_next/") || url.pathname.startsWith("/__next_") || url.pathname.startsWith("/favicon")) {
    event.respondWith(fetch(request))
    return
  }

  // Don't touch cross-origin requests
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(request))
    return
  }

  // Handle audio streams specially - don't cache them
  if (request.url.includes("blob:") || request.headers.get("range")) {
    return
  }

  // For navigations (HTML documents), do network-first without caching
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/"))
    )
    return
  }

  // Network first for API calls
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone()
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, responseClone))
          return response
        })
        .catch(() => caches.match(request)),
    )
    return
  }

  // Cache first for explicit static assets
  if (STATIC_ASSETS.some((asset) => url.pathname === asset)) {
    event.respondWith(caches.match(request).then((response) => response || fetch(request)))
    return
  }

  // Stale-while-revalidate for other same-origin GETs (images, json, etc.)
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        // Only cache OK, basic (same-origin) responses
        if (networkResponse && networkResponse.ok && networkResponse.type === "basic") {
          const clone = networkResponse.clone()
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone))
        }
        return networkResponse
      })

      return cached || fetchPromise
    }),
  )
})

// Handle messages from client
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
})

// Background sync for offline actions
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    event.waitUntil(
      // Handle background sync tasks
      console.log("Background sync triggered"),
    )
  }
})

// Push notifications (for future use)
self.addEventListener("push", (event) => {
  if (event.data) {
    const data = event.data.json()

    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: "/icon-192.png",
        badge: "/icon-192-maskable.png",
        tag: "resonance-notification",
      }),
    )
  }
})
