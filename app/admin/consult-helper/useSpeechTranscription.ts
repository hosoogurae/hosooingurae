"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  appendFinalEntry,
  clearTranscript,
  EMPTY_TRANSCRIPT_STATE,
  setInterimText,
  type TranscriptState,
} from "./transcript";

export type ConsultStatus = "idle" | "listening" | "paused" | "ended";

export interface SpeechDebugLogEntry {
  time: string;
  message: string;
}

export interface UseSpeechTranscriptionResult {
  status: ConsultStatus;
  /** 이 브라우저가 SpeechRecognition을 지원하는지(Chrome/Edge 최신 버전이면 true). */
  isSupported: boolean;
  transcript: TranscriptState;
  /** 권한 거부 등 사용자에게 보여줄 한 줄 안내. 없으면 null. */
  errorMessage: string | null;
  /** 무료 모드(Web Speech API) 전용 진단 로그. OpenAI 모드 로그와는 완전히 별개입니다. */
  debugLog: SpeechDebugLogEntry[];
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  clear: () => void;
}

// 짧은 시간 안에 너무 자주 재시작되면(예: 마이크가 갑자기 사라진 경우)
// 무한 재시도로 배터리/CPU를 낭비하지 않도록 폭주를 감지합니다.
const RESTART_BURST_WINDOW_MS = 10_000;
const RESTART_BURST_LIMIT = 5;

function getSpeechRecognitionCtor(): typeof SpeechRecognition | undefined {
  if (typeof window === "undefined") return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

function subscribeNever() {
  // 지원 여부는 페이지 생명주기 동안 바뀌지 않으므로 구독할 대상이 없습니다.
  return () => {};
}

/** SSR에서는 항상 false(서버엔 window가 없음), 클라이언트에서 실제 지원 여부로 갱신됩니다. */
function useIsSpeechRecognitionSupported(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => Boolean(getSpeechRecognitionCtor()),
    () => false,
  );
}

export function useSpeechTranscription(): UseSpeechTranscriptionResult {
  const [status, setStatus] = useState<ConsultStatus>("idle");
  const [transcript, setTranscript] = useState<TranscriptState>(
    EMPTY_TRANSCRIPT_STATE,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<SpeechDebugLogEntry[]>([]);
  const isSupported = useIsSpeechRecognitionSupported();

  /** Android에서만 자막이 안 나오는 원인을 찾기 위한 무료 모드 전용 진단 로그. 콘솔과 화면에 동시 출력하며, 그 외에는 아무 것도 바꾸지 않습니다. */
  const log = useCallback((message: string) => {
    const time = new Date().toLocaleTimeString("ko-KR", { hour12: false });
    console.log(`[consult-helper/free] ${message}`);
    setDebugLog((prev) => {
      const next = [...prev, { time, message }];
      return next.length > 200 ? next.slice(next.length - 200) : next;
    });
  }, []);

  useEffect(() => {
    log(`SpeechRecognition 지원 여부: ${isSupported}`);
  }, [isSupported, log]);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  // 사용자가 직접 멈춘 것(pause/stop)인지, 브라우저가 조용히 세션을 끊은
  // 것인지 구분하는 플래그 — 후자만 자동 재시작합니다.
  const intentionalStopRef = useRef(true);
  const restartTimestampsRef = useRef<number[]>([]);
  // onend 핸들러가 자기 자신(createAndStartRecognition)을 안전하게 다시
  // 호출할 수 있도록 최신 함수를 담아두는 ref (TDZ/자기참조 문제 회피).
  const createAndStartRef = useRef<() => void>(() => {});

  const stopRecognitionInstance = useCallback(() => {
    intentionalStopRef.current = true;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
  }, []);

  // 페이지 이탈/언마운트 시 마이크가 계속 켜진 채로 남지 않도록 정리합니다.
  useEffect(() => {
    return () => {
      stopRecognitionInstance();
    };
  }, [stopRecognitionInstance]);

  const createAndStartRecognition = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setErrorMessage(
        "이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 또는 Edge 최신 버전을 사용해주세요.",
      );
      setStatus("idle");
      return;
    }

    const recognition = new Ctor();
    recognition.lang = "ko-KR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => log("onstart");
    recognition.onaudiostart = () => log("onaudiostart");
    recognition.onspeechstart = () => log("onspeechstart");

    recognition.onresult = (event) => {
      log(
        `onresult 수신 (resultIndex=${event.resultIndex}, results.length=${event.results.length})`,
      );
      setErrorMessage(null);
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) {
          setTranscript((prev) => appendFinalEntry(prev, text));
        } else {
          setTranscript((prev) => setInterimText(prev, text));
        }
      }
    };

    recognition.onerror = (event) => {
      log(`onerror: ${event.error}`);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        intentionalStopRef.current = true;
        setErrorMessage(
          "마이크 권한이 필요합니다. 브라우저 주소창 옆 자물쇠(또는 마이크) 아이콘에서 마이크 사용을 허용한 뒤 다시 시작해주세요.",
        );
        setStatus("idle");
        return;
      }
      if (event.error === "no-speech") {
        // 정상적인 무음 상태 — 에러로 취급하지 않고 onend의 재시작 로직에 맡깁니다.
        return;
      }
      if (event.error === "audio-capture") {
        // 마이크 장치 자체가 사라진 경우(연결 해제 등) — 재연결되면 자동으로
        // 이어지도록 onend의 재시작 로직은 그대로 두고, 원인만 명확히 안내합니다.
        setErrorMessage(
          "마이크를 찾을 수 없어요. 마이크가 제대로 연결되어 있는지 확인해주세요.",
        );
        return;
      }
      // network/aborted 등 일시적 문제 — onend에서 재시작을 시도합니다.
    };

    recognition.onend = () => {
      log("onend");
      if (intentionalStopRef.current) {
        return;
      }

      // 브라우저가 조용히 세션을 끊은 경우 — 자동으로 새 인스턴스를 만들어
      // 재시작합니다(같은 인스턴스 재사용은 불안정하다고 알려져 있음).
      const now = Date.now();
      restartTimestampsRef.current = restartTimestampsRef.current.filter(
        (t) => now - t < RESTART_BURST_WINDOW_MS,
      );
      restartTimestampsRef.current.push(now);
      log(`자동 재시작 횟수: ${restartTimestampsRef.current.length}`);

      if (restartTimestampsRef.current.length > RESTART_BURST_LIMIT) {
        setErrorMessage("자동 재연결에 실패했어요. '다시 시작'을 눌러주세요.");
        return;
      }

      createAndStartRef.current();
    };

    recognitionRef.current = recognition;
    intentionalStopRef.current = false;
    log("recognition.start() 호출");
    try {
      recognition.start();
    } catch (err) {
      // 이미 시작된 인스턴스에 start()를 다시 호출하면 예외가 발생할 수 있음 — 무시.
      log(`recognition.start() 예외: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [log]);

  useEffect(() => {
    createAndStartRef.current = createAndStartRecognition;
  }, [createAndStartRecognition]);

  const start = useCallback(() => {
    log("start() 호출됨 (버튼 클릭)");
    setErrorMessage(null);
    restartTimestampsRef.current = [];
    setStatus("listening");
    createAndStartRecognition();
  }, [createAndStartRecognition, log]);

  const pause = useCallback(() => {
    intentionalStopRef.current = true;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setStatus("paused");
  }, []);

  const resume = useCallback(() => {
    setErrorMessage(null);
    restartTimestampsRef.current = [];
    setStatus("listening");
    createAndStartRecognition();
  }, [createAndStartRecognition]);

  const stop = useCallback(() => {
    stopRecognitionInstance();
    setStatus("ended");
  }, [stopRecognitionInstance]);

  const clear = useCallback(() => {
    setTranscript(clearTranscript());
  }, []);

  return {
    status,
    isSupported,
    transcript,
    errorMessage,
    debugLog,
    start,
    pause,
    resume,
    stop,
    clear,
  };
}
