"use client";

import { useEffect, useState } from "react";

export type MicPermissionState = "granted" | "denied" | "prompt" | "unsupported";

/**
 * Permissions API로 마이크 권한 상태를 확인합니다. "microphone" 권한 이름을
 * 지원하지 않는 브라우저(Firefox/Safari 일부 버전 등)에서는 조회 자체가
 * 실패하므로 "unsupported"로 처리하고, 그 브라우저에서는 기존처럼 각
 * 엔진(useSpeechTranscription/useOpenAiRealtimeTranscription)의
 * getUserMedia/SpeechRecognition 에러 메시지로만 안내합니다(폴백).
 *
 * 사용자가 브라우저 설정 화면에서 권한을 바꾸면 PermissionStatus의
 * change 이벤트로 이 화면에도 실시간 반영됩니다(페이지를 새로고침하지
 * 않아도 "차단됨" 안내가 사라짐).
 */
function isPermissionsApiAvailable(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.permissions?.query);
}

export function useMicPermission(): MicPermissionState {
  // 동기적으로 알 수 있는 초기값(API 지원 여부)만 초기 상태로 두고, 실제
  // 조회 결과는 effect의 비동기 콜백 안에서만 반영합니다 — effect 본문에서
  // setState를 동기 호출하지 않기 위함입니다.
  const [state, setState] = useState<MicPermissionState>(() =>
    isPermissionsApiAvailable() ? "prompt" : "unsupported",
  );

  useEffect(() => {
    if (!isPermissionsApiAvailable()) return;

    let cancelled = false;
    let status: PermissionStatus | undefined;

    navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((result) => {
        if (cancelled) return;
        status = result;
        setState(result.state as MicPermissionState);
        result.onchange = () => {
          setState(result.state as MicPermissionState);
        };
      })
      .catch(() => {
        // "microphone"을 권한 이름으로 인식하지 못하는 브라우저 — 폴백.
        if (!cancelled) setState("unsupported");
      });

    return () => {
      cancelled = true;
      if (status) status.onchange = null;
    };
  }, []);

  return state;
}
