// 사용법: node scripts/generate-vapid-keys.mjs
// 출력된 두 값을 .env.local(로컬)과 Vercel 환경변수(운영)에 각각 붙여넣으세요.
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY=...  (브라우저에 노출되는 공개 키)
//   VAPID_PRIVATE_KEY=...             (서버 전용, 절대 커밋/공유 금지)
// 이미 구독 중인 기기가 있는 상태에서 키를 다시 생성하면 기존 구독이
// 전부 무효화됩니다(발신자가 바뀐 것으로 간주됨) — 재생성 후에는 관리자
// 화면에서 알림 토글을 껐다 켜서 새 키로 다시 구독해야 합니다.
import webpush from "web-push";

const { publicKey, privateKey } = webpush.generateVAPIDKeys();

console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
