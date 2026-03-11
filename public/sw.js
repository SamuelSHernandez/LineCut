// LineCut Service Worker
// Handles push notifications, offline caching, and notification click routing.

const CACHE_VERSION = "linecut-v1";
const OFFLINE_URL = "/offline.html";

// App shell resources to cache on install
const APP_SHELL = [OFFLINE_URL, "/icon.svg"];

// ──────────────────────────────────────────────
// Install — cache app shell + offline fallback
// ──────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ──────────────────────────────────────────────
// Activate — clean up old caches, claim clients
// ──────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ──────────────────────────────────────────────
// Fetch — caching strategies by request type
// ──────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (mutations should never be cached)
  if (request.method !== "GET") return;

  // Skip Supabase auth and realtime endpoints — never cache
  if (
    url.pathname.startsWith("/auth/") ||
    url.pathname.includes("/realtime/") ||
    url.hostname.includes("supabase")
  ) {
    return;
  }

  // Skip browser-extension requests
  if (!url.protocol.startsWith("http")) return;

  // API routes — network-first, fall back to cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets (images, fonts, SVGs) — cache-first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Navigation requests (HTML pages) — network-first with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(navigationHandler(request));
    return;
  }

  // Everything else (JS/CSS bundles etc.) — stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// ──────────────────────────────────────────────
// Caching strategies
// ──────────────────────────────────────────────

/**
 * Network-first: try network, fall back to cache.
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response("Network error", { status: 503 });
  }
}

/**
 * Cache-first: serve from cache, fetch and update cache on miss.
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

/**
 * Stale-while-revalidate: return cache immediately, update in background.
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || networkFetch;
}

/**
 * Navigation handler: network-first, fall back to offline page.
 */
async function navigationHandler(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Try returning cached version of the page
    const cached = await caches.match(request);
    if (cached) return cached;

    // Last resort — show offline page
    const offlinePage = await caches.match(OFFLINE_URL);
    return offlinePage || new Response("Offline", { status: 503 });
  }
}

/**
 * Check if a URL path points to a static asset.
 */
function isStaticAsset(pathname) {
  return /\.(png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|eot|otf)(\?.*)?$/i.test(
    pathname
  );
}

// ──────────────────────────────────────────────
// Push notifications (preserved from original)
// ──────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    console.error("[sw] Failed to parse push payload");
    return;
  }

  const { title, body, url, orderId } = payload;

  const options = {
    body: body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: {
      url: url || "/",
      orderId: orderId || null,
    },
    vibrate: [100, 50, 100],
  };

  event.waitUntil(
    self.registration.showNotification(title || "LineCut", options)
  );
});

// Notification click — focus existing tab or open new window
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          const clientUrl = new URL(client.url);
          const target = new URL(targetUrl, self.location.origin);
          if (clientUrl.pathname === target.pathname && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
