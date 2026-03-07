// LineCut Service Worker
// Handles push notifications and notification click routing.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Push event — show notification
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
    icon: "/logo.png",
    badge: "/logo.png",
    data: {
      url: url || "/",
      orderId: orderId || null,
    },
    // Vibrate pattern for mobile
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(title || "LineCut", options));
});

// Notification click — focus existing tab or open new window
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Try to focus an existing tab at this URL first
        for (const client of windowClients) {
          const clientUrl = new URL(client.url);
          const target = new URL(targetUrl, self.location.origin);
          if (clientUrl.pathname === target.pathname && "focus" in client) {
            return client.focus();
          }
        }
        // No matching tab — open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
