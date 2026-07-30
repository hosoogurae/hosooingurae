"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 마이크 음량 레벨(0~1)을 실시간으로 계산합니다. 두 모드 공통으로 씁니다.
 * - 고정확도 모드처럼 이미 열려 있는 MediaStream이 있으면 그걸 그대로
 *   재사용합니다(마이크를 두 번 열지 않음).
 * - 무료 모드는 SpeechRecognition이 스트림을 노출하지 않으므로, active가
 *   true인 동안 미터링 전용으로 별도의 가벼운 getUserMedia 스트림을 직접
 *   엽니다. 오디오는 어디에도 저장하지 않고 레벨 계산에만 씁니다.
 */
export function useMicLevel(
  active: boolean,
  externalStream?: MediaStream | null,
): number {
  const [level, setLevel] = useState(0);
  const ownStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!active) {
      return;
    }

    let cancelled = false;
    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let rafId: number | null = null;

    async function setup() {
      let stream = externalStream ?? null;
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch {
          // 권한 거부 등 — 게이지는 그냥 0으로 유지합니다(별도 에러 표시는
          // 실제 인식 엔진 쪽 에러 메시지가 이미 담당).
          return;
        }
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        ownStreamRef.current = stream;
      }

      audioContext = new AudioContext();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.fftSize);

      function tick() {
        if (cancelled || !analyser) return;
        analyser.getByteTimeDomainData(buffer);
        let sumSquares = 0;
        for (let i = 0; i < buffer.length; i++) {
          const normalized = (buffer[i] - 128) / 128;
          sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / buffer.length);
        setLevel(Math.min(1, rms * 4));
        rafId = requestAnimationFrame(tick);
      }
      tick();
    }

    setup();

    return () => {
      cancelled = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      source?.disconnect();
      analyser?.disconnect();
      audioContext?.close().catch(() => {});
      ownStreamRef.current?.getTracks().forEach((track) => track.stop());
      ownStreamRef.current = null;
    };
  }, [active, externalStream]);

  return active ? level : 0;
}
