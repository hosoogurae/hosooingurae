"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  appendFinalEntry,
  clearTranscript,
  EMPTY_TRANSCRIPT_STATE,
  setInterimText,
  type TranscriptState,
} from "./transcript";
import type { ConsultSessionSummary, ConsultStatus, TurnDetectionMode } from "./engine";

/**
 * 고정확도 모드(OpenAI Realtime, WebRTC) 훅. 무료 모드
 * (useSpeechTranscription.ts)와 완전히 별개 구현이지만, transcript.ts의
 * 같은 자막 데이터 모델을 쓰고 engine.ts의 같은 인터페이스를 반환합니다.
 *
 * 연결 실패 시 자동으로 무료 모드로 전환하지 않습니다 — status를
 * "error"로만 세팅하고, "다시 시도"(다시 start() 호출)나 "무료 모드로
 * 전환" 중 무엇을 할지는 page.tsx가 사용자에게 선택하게 합니다.
 *
 * 리서치 시점(2026-07) 기준 추정 단가 — 실제 청구와 다를 수 있습니다.
 */
const PRICE_PER_MINUTE_USD = 0.017;

const OPENAI_SDP_EXCHANGE_URL = "https://api.openai.com/v1/realtime/calls";

/** 연결이 예기치 않게 끊겼을 때 자동 재연결을 시도하는 최대 횟수. */
const MAX_AUTO_RECONNECT_ATTEMPTS = 2;

export interface DebugLogEntry {
  time: string;
  message: string;
}

interface UseOpenAiRealtimeTranscriptionResult {
  status: ConsultStatus;
  isSupported: boolean;
  transcript: TranscriptState;
  errorMessage: string | null;
  elapsedSeconds: number;
  lastSessionSummary: ConsultSessionSummary | null;
  /** 마이크 음량 게이지가 재사용할 스트림(있을 때만). */
  micStream: MediaStream | null;
  modelLabel: string | null;
  turnDetectionMode: TurnDetectionMode;
  setTurnDetectionMode: (mode: TurnDetectionMode) => void;
  reconnectAttempt: number;
  /** WebRTC 연결 과정 진단용 로그(콘솔 + 화면 표시 겸용). 기능에는 영향 없음. */
  debugLog: DebugLogEntry[];
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  clear: () => void;
}

function isWebRtcSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof RTCPeerConnection !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

function subscribeNever() {
  return () => {};
}

function useIsWebRtcSupported(): boolean {
  return useSyncExternalStore(subscribeNever, isWebRtcSupported, () => false);
}

interface TranscriptionDeltaEvent {
  type: "conversation.item.input_audio_transcription.delta";
  delta?: string;
}
interface TranscriptionCompletedEvent {
  type: "conversation.item.input_audio_transcription.completed";
  transcript?: string;
}
type RealtimeEvent =
  | TranscriptionDeltaEvent
  | TranscriptionCompletedEvent
  | { type: string; [key: string]: unknown };

export function useOpenAiRealtimeTranscription(): UseOpenAiRealtimeTranscriptionResult {
  const [status, setStatus] = useState<ConsultStatus>("idle");
  const [transcript, setTranscript] = useState<TranscriptState>(EMPTY_TRANSCRIPT_STATE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [lastSessionSummary, setLastSessionSummary] =
    useState<ConsultSessionSummary | null>(null);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [modelLabel, setModelLabel] = useState<string | null>(null);
  const [turnDetectionMode, setTurnDetectionModeState] =
    useState<TurnDetectionMode>("server_vad_default");
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [debugLog, setDebugLog] = useState<DebugLogEntry[]>([]);
  const isSupported = useIsWebRtcSupported();

  /** Android에서만 실패하는 원인을 찾기 위한 진단용 로그. 콘솔과 화면에 동시 출력하며, 그 외에는 아무 것도 바꾸지 않습니다. */
  const log = useCallback((message: string) => {
    const time = new Date().toLocaleTimeString("ko-KR", { hour12: false });
    console.log(`[consult-helper/openai] ${message}`);
    setDebugLog((prev) => {
      const next = [...prev, { time, message }];
      return next.length > 200 ? next.slice(next.length - 200) : next;
    });
  }, []);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const accumulatedMsRef = useRef(0);
  const segmentStartRef = useRef<number | null>(null);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 사용자가 직접 stop()을 눌러서 끊은 것인지(재연결 금지) 구분합니다.
  const intentionalStopRef = useRef(true);
  // 연결 시도마다 1씩 늘어나는 세대 번호 — 재연결로 이전 연결이 교체된 뒤에도
  // 그 이전 연결의 이벤트(onmessage/onclose 등)가 뒤늦게 도착해 상태를
  // 잘못 건드리는 것을 막습니다(중복 자막/중복 연결 방지의 핵심 장치).
  const connectionGenerationRef = useRef(0);
  // pc.onconnectionstatechange와 dataChannel.onclose/onerror가 같은 끊김을
  // 동시에 감지해도 재연결 시도가 두 번 일어나지 않도록 막는 플래그.
  const disconnectHandledRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const turnDetectionModeRef = useRef<TurnDetectionMode>("server_vad_default");

  const startElapsedTimer = useCallback(() => {
    segmentStartRef.current = Date.now();
    tickIntervalRef.current = setInterval(() => {
      const segmentStart = segmentStartRef.current ?? Date.now();
      setElapsedSeconds(
        Math.floor((accumulatedMsRef.current + (Date.now() - segmentStart)) / 1000),
      );
    }, 1000);
  }, []);

  const stopElapsedTimer = useCallback(() => {
    if (tickIntervalRef.current !== null) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
    if (segmentStartRef.current !== null) {
      accumulatedMsRef.current += Date.now() - segmentStartRef.current;
      segmentStartRef.current = null;
    }
  }, []);

  const cleanupConnection = useCallback(() => {
    dataChannelRef.current?.close();
    dataChannelRef.current = null;
    peerConnectionRef.current?.getSenders().forEach((sender) => sender.track?.stop());
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    setMicStream((prev) => {
      prev?.getTracks().forEach((track) => track.stop());
      return null;
    });
  }, []);

  // 언마운트/페이지 이탈 시 연결과 마이크를 확실히 정리합니다.
  useEffect(() => {
    return () => {
      intentionalStopRef.current = true;
      stopElapsedTimer();
      cleanupConnection();
    };
  }, [stopElapsedTimer, cleanupConnection]);

  const setTurnDetectionMode = useCallback((mode: TurnDetectionMode) => {
    turnDetectionModeRef.current = mode;
    setTurnDetectionModeState(mode);
  }, []);

  const makeHandleRealtimeEvent = useCallback((generation: number) => {
    return (raw: string) => {
      // 이 연결이 이미 재연결로 교체된 뒤 도착한 지연 이벤트는 무시합니다
      // (중복 자막 방지).
      if (generation !== connectionGenerationRef.current) return;

      let payload: RealtimeEvent;
      try {
        payload = JSON.parse(raw);
      } catch {
        return;
      }

      if (payload.type === "response.audio_transcript.delta") {
        log("response.audio_transcript.delta 수신");
      }

      if (payload.type === "conversation.item.input_audio_transcription.delta") {
        log("conversation.item.input_audio_transcription.delta 수신");
        const delta = (payload as TranscriptionDeltaEvent).delta ?? "";
        setTranscript((prev) => setInterimText(prev, delta));
      } else if (
        payload.type === "conversation.item.input_audio_transcription.completed"
      ) {
        log("conversation.item.input_audio_transcription.completed 수신");
        const text = (payload as TranscriptionCompletedEvent).transcript ?? "";
        setTranscript((prev) => appendFinalEntry(prev, text));
      }
    };
  }, [log]);

  // 아래에서 서로를 참조해야 해서(연결 실패 시 이 함수가 재연결로 자기
  // 자신을 다시 부름) ref에 최신 함수를 담아 순환 참조 문제를 피합니다.
  const connectRef = useRef<(isReconnect: boolean) => Promise<void>>(async () => {});

  const handleDisconnect = useCallback((generation: number) => {
    if (generation !== connectionGenerationRef.current) return;
    if (disconnectHandledRef.current) return;
    disconnectHandledRef.current = true;

    stopElapsedTimer();

    if (intentionalStopRef.current) {
      // 사용자가 직접 종료한 경우 — 재연결하지 않습니다.
      return;
    }

    if (reconnectAttemptRef.current >= MAX_AUTO_RECONNECT_ATTEMPTS) {
      setStatus("error");
      setErrorMessage(
        `연결이 끊겨 ${MAX_AUTO_RECONNECT_ATTEMPTS}회 자동 재연결을 시도했지만 실패했어요. 다시 시도하거나 무료 모드로 전환해주세요.`,
      );
      return;
    }

    reconnectAttemptRef.current += 1;
    setReconnectAttempt(reconnectAttemptRef.current);
    setStatus("reconnecting");
    setErrorMessage(
      `연결이 끊겨 다시 연결하는 중이에요 (${reconnectAttemptRef.current}/${MAX_AUTO_RECONNECT_ATTEMPTS})...`,
    );
    void connectRef.current(true);
  }, [stopElapsedTimer]);

  const connect = useCallback(
    async (isReconnect: boolean) => {
      // 재연결이 아니라 새로 시작하는 경우에만 지금까지의 상태를 초기화합니다
      // (재연결 중에는 그동안 쌓인 자막·경과시간을 그대로 유지).
      if (!isReconnect) {
        reconnectAttemptRef.current = 0;
        setReconnectAttempt(0);
        accumulatedMsRef.current = 0;
        setElapsedSeconds(0);
        setLastSessionSummary(null);
      }

      // 이전 연결(있다면)을 먼저 완전히 정리한 뒤, 새 세대 번호를 발급합니다 —
      // 이 시점 이후로 이전 세대의 이벤트는 전부 무시됩니다(중복 연결 방지).
      cleanupConnection();
      connectionGenerationRef.current += 1;
      const generation = connectionGenerationRef.current;
      disconnectHandledRef.current = false;

      setErrorMessage(null);
      setStatus(isReconnect ? "reconnecting" : "connecting");
      intentionalStopRef.current = false;

      try {
        const tokenResponse = await fetch("/api/admin/consult-helper/realtime-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ turnDetection: turnDetectionModeRef.current }),
        });
        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok || typeof tokenData.clientSecret !== "string") {
          log(`realtime-token 발급 실패 (status=${tokenResponse.status})`);
          throw new Error(tokenData.error ?? "고정확도 모드 연결에 실패했습니다.");
        }
        log(`realtime-token 발급 성공 (status=${tokenResponse.status})`);
        if (generation !== connectionGenerationRef.current) return; // 이미 교체됨

        const clientSecret: string = tokenData.clientSecret;
        if (typeof tokenData.modelLabel === "string") setModelLabel(tokenData.modelLabel);

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (generation !== connectionGenerationRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const pc = new RTCPeerConnection();
        stream.getAudioTracks().forEach((track) => pc.addTrack(track, stream));

        const dataChannel = pc.createDataChannel("oai-events");
        log("DataChannel 생성");
        dataChannel.onopen = () => log("DataChannel open");
        dataChannel.onmessage = (event) => {
          log(`DataChannel message 수신 (${String(event.data).length}자)`);
          makeHandleRealtimeEvent(generation)(event.data);
        };
        dataChannel.onclose = () => {
          log("DataChannel close");
          handleDisconnect(generation);
        };
        dataChannel.onerror = () => {
          log("DataChannel error");
          handleDisconnect(generation);
        };
        dataChannelRef.current = dataChannel;

        pc.onconnectionstatechange = () => {
          log(`peerConnection connectionState: ${pc.connectionState}`);
          if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
            handleDisconnect(generation);
          }
        };
        pc.oniceconnectionstatechange = () => {
          log(`ICE connectionState: ${pc.iceConnectionState}`);
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        log("SDP 요청 시작");
        const sdpResponse = await fetch(OPENAI_SDP_EXCHANGE_URL, {
          method: "POST",
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${clientSecret}`,
            "Content-Type": "application/sdp",
          },
        });

        if (!sdpResponse.ok) {
          log(`SDP 응답 실패 (status=${sdpResponse.status})`);
          throw new Error("고정확도 모드 연결에 실패했습니다.");
        }
        log(`SDP 응답 성공 (status=${sdpResponse.status})`);
        const answerSdp = await sdpResponse.text();
        await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
        log("setRemoteDescription 성공");

        if (generation !== connectionGenerationRef.current) {
          pc.close();
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        peerConnectionRef.current = pc;
        setMicStream(stream);
        setErrorMessage(null);
        startElapsedTimer();
        setStatus("listening");
      } catch (err) {
        log(`예외 발생: ${err instanceof Error ? err.message : String(err)}`);
        if (generation !== connectionGenerationRef.current) return;
        cleanupConnection();
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "고정확도 모드 연결에 실패했습니다. 다시 시도하거나 무료 모드로 전환해주세요.",
        );
        setStatus("error");
      }
    },
    [cleanupConnection, makeHandleRealtimeEvent, handleDisconnect, startElapsedTimer, log],
  );

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const start = useCallback(() => {
    // 이미 연결 중/연결됨 상태에서 중복으로 start()가 눌려도 무시합니다
    // (중복 연결 방지).
    if (status === "connecting" || status === "listening" || status === "reconnecting") {
      return;
    }
    void connect(false);
  }, [connect, status]);

  const pause = useCallback(() => {
    const track = peerConnectionRef.current
      ?.getSenders()
      .find((sender) => sender.track?.kind === "audio")?.track;
    if (track) track.enabled = false;
    stopElapsedTimer();
    setStatus("paused");
  }, [stopElapsedTimer]);

  const resume = useCallback(() => {
    const track = peerConnectionRef.current
      ?.getSenders()
      .find((sender) => sender.track?.kind === "audio")?.track;
    if (track) track.enabled = true;
    startElapsedTimer();
    setStatus("listening");
  }, [startElapsedTimer]);

  const stop = useCallback(() => {
    intentionalStopRef.current = true;
    connectionGenerationRef.current += 1; // 이후의 모든 지연 이벤트를 무효화
    stopElapsedTimer();
    const totalMs = accumulatedMsRef.current;
    setLastSessionSummary({
      elapsedSeconds: Math.round(totalMs / 1000),
      estimatedCostUsd: (totalMs / 60000) * PRICE_PER_MINUTE_USD,
    });
    cleanupConnection();
    setStatus("ended");
  }, [cleanupConnection, stopElapsedTimer]);

  const clear = useCallback(() => {
    setTranscript(clearTranscript());
  }, []);

  return {
    status,
    isSupported,
    transcript,
    errorMessage,
    elapsedSeconds,
    lastSessionSummary,
    micStream,
    modelLabel,
    turnDetectionMode,
    setTurnDetectionMode,
    reconnectAttempt,
    debugLog,
    start,
    pause,
    resume,
    stop,
    clear,
  };
}
