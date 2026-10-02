import webpush from "web-push";
import type { StoredPushSubscription } from "../data/pushSubscriptions";
import {
  deleteSubscriptionByEndpoint,
  getAllSubscriptions,
  getSubscriptionByEndpoint,
} from "./pushSubscriptions";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT;
const vapidConfigured = Boolean(vapidPublicKey && vapidPrivateKey && vapidSubject);

if (vapidConfigured) {
  webpush.setVapidDetails(vapidSubject!, vapidPublicKey!, vapidPrivateKey!);
}

interface PushPayload {
  title: string;
  body: string;
  url: string;
}

function isExpiredSubscriptionError(error: unknown): boolean {
  return (
    error instanceof webpush.WebPushError &&
    (error.statusCode === 404 || error.statusCode === 410)
  );
}

async function sendToOne(
  subscription: StoredPushSubscription,
  payload: PushPayload,
): Promise<{ error?: string }> {
  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: subscription.keys },
      JSON.stringify(payload),
    );
    return {};
  } catch (error) {
    if (isExpiredSubscriptionError(error)) {
      await deleteSubscriptionByEndpoint(subscription.endpoint);
      console.warn(`[push] 만료된 구독을 정리했습니다: ${subscription.endpoint}`);
      return { error: "구독이 만료되었습니다." };
    }
    console.error(`[push] 발송 실패 (endpoint=${subscription.endpoint})`, error);
    return { error: "발송에 실패했습니다." };
  }
}

/**
 * 새 문의 저장 성공 직후 호출합니다. 저장된 구독 전체에 발송하며, 이 함수
 * 자체는 에러를 던지지 않습니다(개별 발송 실패는 로그만 남기고 계속 진행) —
 * 다만 호출하는 쪽에서 이 함수 호출 자체를 try/catch로 감싸는 것을 권장합니다
 * (예: VAPID 키 누락처럼 예상 밖의 예외가 나더라도 문의 저장 흐름을 막지 않도록).
 */
export async function sendNewContactPush(
  name: string,
  listingLabel: string,
): Promise<void> {
  if (!vapidConfigured) {
    console.error("[push] VAPID 키가 설정되지 않아 발송을 건너뜁니다.");
    return;
  }

  const subscriptions = await getAllSubscriptions();
  if (subscriptions.length === 0) return;

  const payload: PushPayload = {
    title: "새 문의",
    body: `새 문의 · ${name} · ${listingLabel}`,
    url: "/admin/contacts",
  };

  await Promise.all(subscriptions.map((sub) => sendToOne(sub, payload)));
}

/** 관리자 화면 "테스트 알림 보내기" 버튼 전용. 지정한 기기(endpoint) 하나에만 보냅니다. */
export async function sendTestPush(endpoint: string): Promise<{ error?: string }> {
  if (!vapidConfigured) {
    return { error: "VAPID 키가 설정되지 않았습니다." };
  }

  const subscription = await getSubscriptionByEndpoint(endpoint);
  if (!subscription) {
    return { error: "이 기기의 구독 정보를 찾을 수 없습니다. 알림을 다시 켜주세요." };
  }

  return sendToOne(subscription, {
    title: "테스트 알림",
    body: "테스트 알림이 정상적으로 도착했습니다.",
    url: "/admin/contacts",
  });
}

/** 검사 1회에서 새로 발견된 거래 의심 건을 관리자에게 한 번만 요약 발송합니다. */
export async function sendNewSuspectedMatchesPush(count: number): Promise<void> {
  if (!vapidConfigured || count <= 0) return;
  const subscriptions = await getAllSubscriptions();
  if (subscriptions.length === 0) return;
  const payload: PushPayload = {
    title: "거래 의심 매물",
    body: `새로운 거래 의심 매물 ${count}건이 발견되었습니다.`,
    url: "/admin/listings/manage?filter=suspected",
  };
  await Promise.all(subscriptions.map((sub) => sendToOne(sub, payload)));
}

/**
 * 90일 자동 보류 cron이 매물을 실제로 보류시켰을 때만 호출합니다(0건이면
 * 호출하는 쪽에서부터 호출하지 않음). 손님 화면에서 매물이 조용히 사라지면
 * 나중에 "왜 줄었지"가 되므로, 몇 건이 내려갔는지 바로 알립니다.
 */
export async function sendAutoHoldPush(count: number): Promise<void> {
  if (!vapidConfigured || count <= 0) return;
  const subscriptions = await getAllSubscriptions();
  if (subscriptions.length === 0) return;
  const payload: PushPayload = {
    title: "매물 자동 보류",
    body: `매물 ${count}건이 자동 보류되었습니다.`,
    url: "/admin/listings/manage?filter=auto-held",
  };
  await Promise.all(subscriptions.map((sub) => sendToOne(sub, payload)));
}
