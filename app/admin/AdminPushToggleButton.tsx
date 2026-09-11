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
  // 알림을 막 켠 직후에만 잠깐 보여주는 안내 — 확인용 알림을 "보냈다"는
  // 사실만 말합니다(실제 도착 여부는 사람이 눈으로 확인). title 툴팁은
  // 이 화면을 주로 쓰는 휴대폰에서 안 보여서 인라인 텍스트로 둡니다.
  const [enableHint, setEnableHint] = useState<string | null>(null);

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
    setEnableHint(null);
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

      // 구독 저장이 성공했다고 끝이 아니라, 실제로 확인용 알림을 한 번 보내
      // 사람이 직접 눈으로 확인하게 합니다 — "켜진 줄 알았는데 실제로는 안
      // 켜진" 상태를 막는 것이 이 기능의 존재 이유입니다. 켤 때만 보내고,
      // 끌 때는 보내지 않습니다.
      try {
        const testResponse = await fetch("/api/admin/push-subscriptions/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        const testData = await testResponse.json();

        if (!testResponse.ok) {
          alert(testData.errors?.[0] ?? "확인용 알림 전송에 실패했습니다.");
        } else {
          setEnableHint("확인용 알림을 보냈습니다. 알림이 안 오면 껐다 켜보세요.");
          setTimeout(() => setEnableHint(null), 5000);
        }
      } catch (err) {
        console.error("[push] 확인용 알림 전송 실패", err);
        alert("확인용 알림 전송에 실패했습니다.");
      }
    } catch (err) {
      console.error("[push] 구독 실패", err);
      alert("알림 구독에 실패했습니다. 다시 시도해 주세요.");
      setState("unsubscribed");
    }
  }

  async function handleDisable() {
    setState("busy");
    setEnableHint(null);
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
        className="flex min-h-[44px] items-center rounded-md px-3 text-xs font-semibold text-red-600"
        title="브라우저 주소창 왼쪽 자물쇠 아이콘 > 사이트 설정에서 알림을 허용으로 바꾼 뒤 새로고침해 주세요."
      >
        알림 차단됨
      </span>
    );
  }

  const isSubscribed = state === "subscribed";

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        onClick={isSubscribed ? handleDisable : handleEnable}
        disabled={state === "busy"}
        className="flex min-h-[44px] items-center rounded-md px-3 text-sm font-bold text-navy-800 transition-colors hover:bg-navy-900/5 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubscribed ? "알림 끄기" : "알림 받기"}
      </button>
      {enableHint && (
        <span className="max-w-[160px] px-3 pb-1 text-right text-[11px] leading-tight text-navy-800/60">
          {enableHint}
        </span>
      )}
    </div>
  );
}
