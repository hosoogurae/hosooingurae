"use client";

import { useEffect, useState } from "react";
import { urlBase64ToUint8Array } from "../lib/pushClient";

type PushUiState =
  | "checking"
  | "unsupported"
  | "denied"
  | "subscribed"
  | "unsubscribed"
  | "busy";

/**
 * "이 기기에서 알림 받기" 토글. 알림 권한을 한 번 차단하면 브라우저가 그
 * 상태를 기억해 다시 물어볼 방법이 없으므로(재요청 시 즉시 거부됨),
 * Notification.permission === "denied"를 감지해 안내 문구로 대체합니다.
 */
export function AdminPushToggleButton() {
  const [state, setState] = useState<PushUiState>("checking");

  useEffect(() => {
    let cancelled = false;

    async function checkState() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        if (!cancelled) setState("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setState("denied");
        return;
      }
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (!cancelled) setState(subscription ? "subscribed" : "unsubscribed");
      } catch {
        if (!cancelled) setState("unsubscribed");
      }
    }

    checkState();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleEnable() {
    setState("busy");
    try {
      const permission = await Notification.requestPermission();
      if (permission === "denied") {
        setState("denied");
        return;
      }
      if (permission !== "granted") {
        setState("unsubscribed");
        return;
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        alert("알림 설정이 아직 완료되지 않았습니다.");
        setState("unsubscribed");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const json = subscription.toJSON();
      const response = await fetch("/api/admin/push-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });

      if (!response.ok) {
        await subscription.unsubscribe();
        alert("구독 저장에 실패했습니다. 다시 시도해 주세요.");
        setState("unsubscribed");
        return;
      }

      setState("subscribed");
    } catch (err) {
      console.error("[push] 구독 실패", err);
      alert("알림 구독에 실패했습니다. 다시 시도해 주세요.");
      setState("unsubscribed");
    }
  }

  async function handleDisable() {
    setState("busy");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await fetch(
          `/api/admin/push-subscriptions?endpoint=${encodeURIComponent(endpoint)}`,
          { method: "DELETE" },
        );
      }
      setState("unsubscribed");
    } catch (err) {
      console.error("[push] 구독 해제 실패", err);
      setState("subscribed");
    }
  }

  if (state === "unsupported" || state === "checking") return null;

  if (state === "denied") {
    return (
      <span
        className="rounded-md px-3 py-2 text-xs font-semibold text-red-600 sm:text-sm"
        title="브라우저 주소창 왼쪽 자물쇠 아이콘 > 사이트 설정에서 알림을 허용으로 바꾼 뒤 새로고침해 주세요."
      >
        알림 차단됨 · 브라우저 설정에서 허용해 주세요
      </span>
    );
  }

  const isSubscribed = state === "subscribed";

  return (
    <button
      type="button"
      onClick={isSubscribed ? handleDisable : handleEnable}
      disabled={state === "busy"}
      className="rounded-md px-3 py-2 text-sm font-bold text-navy-800 transition-colors hover:bg-navy-900/5 disabled:cursor-not-allowed disabled:opacity-50 sm:text-base"
    >
      {isSubscribed ? "이 기기 알림 끄기" : "이 기기에서 알림 받기"}
    </button>
  );
}
