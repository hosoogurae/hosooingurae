// 설치형 PWA 요건(등록된 서비스워커) 충족용 최소 서비스워커입니다.
// 의도적으로 Cache Storage를 전혀 쓰지 않습니다 — 모든 요청을 그대로
// 네트워크로 통과시키기만 합니다. 즉 관리자 페이지, /api 응답, 로그인
// 세션, 상담 자막 등 어떤 것도 오프라인 캐시에 저장되지 않습니다.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});

// 관리자 새 문의 알림. payload는 app/lib/push.ts가 { title, body, url } 모양으로 보냅니다.
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  const targetUrl = payload.url || "/admin/contacts";

  event.waitUntil(
    self.registration.showNotification(payload.title || "새 알림", {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: targetUrl },
    }),
  );
});

// 이미 열려 있는 문의함 탭이 있으면 포커스만 하고, 없으면 새로 엽니다.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/admin/contacts";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (new URL(client.url).pathname === targetUrl && "focus" in client) {
            return client.focus();
          }
        }
        return self.clients.openWindow(targetUrl);
      }),
  );
});
