self.addEventListener("push", (event) => {
  const payload = event.data
    ? event.data.json()
    : { title: "Sneaker alert", body: "A matching release was found.", url: "/" };

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      data: { url: payload.url || "/" },
      icon: "/icon.svg",
      badge: "/icon.svg"
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});
