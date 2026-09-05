self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = { title: "CoolInk Tattoo Studio", body: "Masz nową wiadomość.", url: "/app/portal/notifications" };
  try { data = { ...data, ...(event.data ? event.data.json() : {}) }; } catch {}
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || "coolink-notification",
    data: { url: data.url || "/app/portal/notifications" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/app/portal/notifications", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    const visible = clients.find((client) => client.url.startsWith(self.location.origin));
    if (visible) { visible.navigate(target); return visible.focus(); }
    return self.clients.openWindow(target);
  }));
});
