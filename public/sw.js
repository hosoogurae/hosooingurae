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
