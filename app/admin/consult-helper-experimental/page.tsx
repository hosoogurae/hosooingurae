"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { decodeToFloat32Mono16k, pickSupportedMimeType } from "./audio";
import type { DeviceKind, MainToWorkerMessage, WorkerToMainMessage } from "./types";

/**
 * 브라우저 로컬 Whisper(Transformers.js) 성능 검증 전용 실험 페이지입니다.
 * 기존 /admin/consult-helper(무료 Web Speech API 모드, 유료 OpenAI 모드)는
 * 어떤 파일도 공유하지 않고 전혀 건드리지 않습니다. 관리자 네비게이션에도
 * 아직 링크를 추가하지 않았습니다 — 주소를 직접 입력해야만 접근됩니다.
 *
 * 고객 저장·상담 요약·CRM 기능은 이 페이지의 목적이 아닙니다. 순수하게
 * "이 기기에서 브라우저 로컬 한국어 인식이 실사용 가능한 속도/정확도가
 * 나오는지"만 검증합니다.
 */

const CHUNK_MS = 4000;
const MAX_QUEUE_DEPTH = 3;
const MAX_SESSION_MS = 60_000; // 첫 테스트 안전장치: 최대 1분

type ModelStatus = "idle" | "loading" | "ready" | "error";

interface TranscriptEntry {
  id: number;
  text: string;
  inferenceMs: number;
  chunkDurationMs: number;
}

interface DiagnosticsLogEntry {
  time: string;
  message: string;
}

function subscribeNever() {
  return () => {};
}

/** SSR에서는 항상 false, 클라이언트에서 실제 지원 여부로 갱신됩니다. */
function useWebGpuSupported(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => typeof navigator !== "undefined" && "gpu" in navigator,
    () => false,
  );
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function getMemoryInfoLabel(): string {
  if (typeof performance === "undefined") return "이 브라우저에서 확인 불가";
  const perf = performance as Performance & {
    memory?: { usedJSHeapSize: number };
  };
  if (!perf.memory) return "이 브라우저에서 확인 불가";
  return `${formatBytes(perf.memory.usedJSHeapSize)} (Chrome 전용 지표, 참고용)`;
}

export default function ConsultHelperExperimentalPage() {
  const webgpuSupported = useWebGpuSupported();

  // 마운트되면 항상 바로 모델 로딩을 시작하므로("idle" 상태를 거치지
  // 않음) 초기값을 "loading"으로 둡니다 — 이펙트 안에서 동기적으로
  // setState하지 않기 위함입니다.
  const [modelStatus, setModelStatus] = useState<ModelStatus>("loading");
  const [loadingPercent, setLoadingPercent] = useState(0);
  const [device, setDevice] = useState<DeviceKind | null>(null);
  const [loadMs, setLoadMs] = useState<number | null>(null);
  const [downloadBytes, setDownloadBytes] = useState<number | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingPausedForBacklog, setRecordingPausedForBacklog] = useState(false);
  const [queueDepth, setQueueDepth] = useState(0);
  const [processingChunkId, setProcessingChunkId] = useState<number | null>(null);
  const [sessionSecondsLeft, setSessionSecondsLeft] = useState<number | null>(null);

  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [diagnosticsLog, setDiagnosticsLog] = useState<DiagnosticsLogEntry[]>([]);

  const workerRef = useRef<Worker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stopChunkCycleRef = useRef<(() => void) | null>(null);
  const pendingChunksRef = useRef<{ id: number; blob: Blob }[]>([]);
  const workerBusyRef = useRef(false);
  const nextChunkIdRef = useRef(0);
  const chunkMetaRef = useRef<Map<number, { durationMs: number }>>(new Map());
  const fileTotalsRef = useRef<Map<string, number>>(new Map());
  const fileLoadedRef = useRef<Map<string, number>>(new Map());
  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const log = useCallback((message: string) => {
    const time = new Date().toLocaleTimeString("ko-KR", { hour12: false });
    console.log(`[consult-helper-experimental] ${message}`);
    setDiagnosticsLog((prev) => {
      const next = [...prev, { time, message }];
      return next.length > 200 ? next.slice(next.length - 200) : next;
    });
  }, []);

  // onend류 핸들러가 자기 자신을 안전하게 다시 부를 수 있도록 최신 함수를
  // 담아두는 ref (다른 consult-helper 훅들과 동일한 패턴, 파일은 공유하지 않음).
  const processQueueRef = useRef<() => void>(() => {});

  const processQueue = useCallback(() => {
    if (workerBusyRef.current) return;
    const next = pendingChunksRef.current.shift();
    setQueueDepth(pendingChunksRef.current.length);
    if (!next) return;

    workerBusyRef.current = true;
    setProcessingChunkId(next.id);

    void (async () => {
      try {
        const audio = await decodeToFloat32Mono16k(next.blob);
        chunkMetaRef.current.set(next.id, {
          durationMs: (audio.length / 16000) * 1000,
        });
        const message: MainToWorkerMessage = {
          type: "transcribe",
          chunkId: next.id,
          audio,
        };
        workerRef.current?.postMessage(message, [audio.buffer]);
      } catch (err) {
        log(`청크 #${next.id} 디코딩 실패: ${err instanceof Error ? err.message : String(err)}`);
        workerBusyRef.current = false;
        setProcessingChunkId(null);
        processQueueRef.current();
      }
    })();
  }, [log]);

  useEffect(() => {
    processQueueRef.current = processQueue;
  }, [processQueue]);

  const enqueueChunk = useCallback(
    (blob: Blob) => {
      const id = nextChunkIdRef.current++;
      pendingChunksRef.current.push({ id, blob });
      setQueueDepth(pendingChunksRef.current.length);
      log(`청크 #${id} 녹음 완료 (대기열 ${pendingChunksRef.current.length}개)`);

      if (pendingChunksRef.current.length > MAX_QUEUE_DEPTH) {
        log("대기열이 너무 쌓여 녹음을 일시중지합니다.");
        setRecordingPausedForBacklog(true);
        stopChunkCycleRef.current?.();
        stopChunkCycleRef.current = null;
      }

      processQueue();
    },
    [log, processQueue],
  );

  const startChunkCycle = useCallback(
    (stream: MediaStream) => {
      let stopped = false;
      const mimeType = pickSupportedMimeType();

      async function recordOneChunk() {
        if (stopped) return;
        let recorder: MediaRecorder;
        try {
          recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        } catch (err) {
          log(`MediaRecorder 생성 실패: ${err instanceof Error ? err.message : String(err)}`);
          setErrorMessage("이 브라우저에서 오디오 녹음을 시작할 수 없습니다.");
          return;
        }

        const chunks: BlobPart[] = [];
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunks.push(event.data);
        };
        const stoppedPromise = new Promise<void>((resolve) => {
          recorder.onstop = () => resolve();
        });

        recorder.start();
        await new Promise((resolve) => setTimeout(resolve, CHUNK_MS));
        if (recorder.state !== "inactive") recorder.stop();
        await stoppedPromise;

        if (stopped) return;
        if (chunks.length > 0) {
          enqueueChunk(new Blob(chunks, { type: mimeType ?? "audio/webm" }));
        }
        if (!stopped) void recordOneChunk();
      }

      void recordOneChunk();
      return () => {
        stopped = true;
      };
    },
    [enqueueChunk, log],
  );

  // 대기열이 안전 수준으로 줄어들면 자동으로 녹음을 재개합니다.
  useEffect(() => {
    if (
      recordingPausedForBacklog &&
      queueDepth <= 1 &&
      streamRef.current &&
      !stopChunkCycleRef.current
    ) {
      log("대기열이 줄어들어 녹음을 다시 시작합니다.");
      setRecordingPausedForBacklog(false);
      stopChunkCycleRef.current = startChunkCycle(streamRef.current);
    }
  }, [queueDepth, recordingPausedForBacklog, startChunkCycle, log]);

  const stop = useCallback(() => {
    log("상담 종료(정리 시작)");
    stopChunkCycleRef.current?.();
    stopChunkCycleRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    pendingChunksRef.current = [];
    setQueueDepth(0);
    setIsRecording(false);
    setRecordingPausedForBacklog(false);
    setProcessingChunkId(null);
    if (sessionTimerRef.current) {
      clearTimeout(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    if (sessionIntervalRef.current) {
      clearInterval(sessionIntervalRef.current);
      sessionIntervalRef.current = null;
    }
    setSessionSecondsLeft(null);
  }, [log]);

  const start = useCallback(async () => {
    setErrorMessage(null);
    setEntries([]);
    nextChunkIdRef.current = 0;
    pendingChunksRef.current = [];
    setQueueDepth(0);
    setRecordingPausedForBacklog(false);
    log("상담 시작 클릭");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      log(`마이크 권한 실패: ${err instanceof Error ? err.message : String(err)}`);
      setErrorMessage("마이크 권한이 필요합니다.");
      return;
    }
    streamRef.current = stream;

    setIsRecording(true);
    stopChunkCycleRef.current = startChunkCycle(stream);

    setSessionSecondsLeft(MAX_SESSION_MS / 1000);
    sessionIntervalRef.current = setInterval(() => {
      setSessionSecondsLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
    }, 1000);
    sessionTimerRef.current = setTimeout(() => {
      log("첫 테스트 안전장치(최대 1분) 도달 — 자동 종료합니다.");
      stop();
    }, MAX_SESSION_MS);
  }, [startChunkCycle, stop, log]);

  // Worker 생성 + 모델 로딩 시작 (마운트 시 1회).
  useEffect(() => {
    const worker = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });
    workerRef.current = worker;

    worker.addEventListener("message", (event: MessageEvent<WorkerToMainMessage>) => {
      const data = event.data;

      if (data.type === "log") {
        log(data.message);
        return;
      }

      if (data.type === "loading-progress") {
        fileTotalsRef.current.set(data.file, data.total);
        fileLoadedRef.current.set(data.file, data.loaded);
        const totalSum = [...fileTotalsRef.current.values()].reduce((a, b) => a + b, 0);
        const loadedSum = [...fileLoadedRef.current.values()].reduce((a, b) => a + b, 0);
        setLoadingPercent(totalSum > 0 ? Math.min(100, Math.round((loadedSum / totalSum) * 100)) : 0);
        return;
      }

      if (data.type === "ready") {
        setModelStatus("ready");
        setDevice(data.device);
        setLoadMs(Math.round(data.loadMs));
        setDownloadBytes(data.downloadBytes);
        log(
          `모델 준비 완료: device=${data.device}, 로딩 시간=${Math.round(data.loadMs)}ms, ` +
            `다운로드=${formatBytes(data.downloadBytes)}`,
        );
        return;
      }

      if (data.type === "result") {
        const meta = chunkMetaRef.current.get(data.chunkId);
        chunkMetaRef.current.delete(data.chunkId);
        const chunkDurationMs = meta?.durationMs ?? CHUNK_MS;
        const rtf = chunkDurationMs > 0 ? data.inferenceMs / chunkDurationMs : null;
        log(
          `청크 #${data.chunkId} 완료 (추론 ${Math.round(data.inferenceMs)}ms, ` +
            `배속(RTF) ${rtf !== null ? rtf.toFixed(2) + "x" : "?"})`,
        );
        const trimmed = data.text.trim();
        if (trimmed) {
          setEntries((prev) => [
            ...prev,
            { id: data.chunkId, text: trimmed, inferenceMs: data.inferenceMs, chunkDurationMs },
          ]);
        }
        workerBusyRef.current = false;
        setProcessingChunkId(null);
        processQueue();
        return;
      }

      if (data.type === "error") {
        log(`오류(${data.scope}): ${data.name} - ${data.message}`);
        setErrorMessage(`${data.name}: ${data.message}`);
        if (data.scope === "load") {
          setModelStatus("error");
        } else {
          workerBusyRef.current = false;
          setProcessingChunkId(null);
          processQueue();
        }
      }
    });

    const loadMessage: MainToWorkerMessage = { type: "load" };
    worker.postMessage(loadMessage);

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [log, processQueue]);

  // 페이지 이탈/언마운트 시 마이크와 타이머를 정리합니다(Worker는 위 effect에서 정리).
  useEffect(() => {
    return () => {
      stopChunkCycleRef.current?.();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
      if (sessionIntervalRef.current) clearInterval(sessionIntervalRef.current);
    };
  }, []);

  async function handleCopyAll() {
    const fullText = entries.map((entry) => entry.text).join("\n");
    if (!fullText) {
      setCopyFeedback("복사할 자막이 없어요.");
      setTimeout(() => setCopyFeedback(null), 2000);
      return;
    }
    try {
      await navigator.clipboard.writeText(fullText);
      setCopyFeedback("복사했어요.");
    } catch {
      setCopyFeedback("복사에 실패했어요.");
    }
    setTimeout(() => setCopyFeedback(null), 2000);
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col px-6 py-10 sm:py-16">
      <p className="text-sm font-semibold tracking-wide text-gold-600">ADMIN · 실험용</p>
      <h1 className="mt-2 text-2xl font-black text-navy-950 sm:text-3xl">
        상담 도우미 — 브라우저 로컬 인식 성능 검증
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-navy-800/70">
        이 화면은 성능 검증 전용입니다. 음성은 이 기기(브라우저) 안에서만 처리되며
        OpenAI API 요금이 발생하지 않습니다. 최초 1회 약 39MB 모델 파일을
        다운로드합니다(이후 재방문 시 브라우저 캐시로 재다운로드 없음).
      </p>

      {errorMessage && (
        <div className="mt-3 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errorMessage}
        </div>
      )}

      {modelStatus === "loading" && (
        <div className="mt-4 rounded-md border border-navy-900/10 bg-navy-900/5 px-4 py-3 text-sm text-navy-800">
          모델 다운로드/로딩 중... {loadingPercent}%
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-navy-900/10">
            <div
              className="h-full rounded-full bg-gold-500 transition-[width] duration-200"
              style={{ width: `${loadingPercent}%` }}
            />
          </div>
        </div>
      )}

      {recordingPausedForBacklog && (
        <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
          처리 속도가 녹음보다 느려 잠시 녹음을 멈췄습니다. 대기열이 줄어들면 자동으로
          다시 시작합니다.
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {!isRecording ? (
          <button
            type="button"
            onClick={() => void start()}
            disabled={modelStatus !== "ready"}
            className="rounded-md bg-gradient-to-r from-gold-500 to-gold-600 px-8 py-4 text-lg font-black text-navy-950 shadow-md shadow-gold-500/30 transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {modelStatus === "ready" ? "상담 시작" : "모델 준비 중..."}
          </button>
        ) : (
          <button
            type="button"
            onClick={stop}
            className="rounded-md border border-red-200 px-5 py-3 text-base font-bold text-red-600 transition-colors hover:bg-red-50"
          >
            상담 종료
          </button>
        )}

        {isRecording && (
          <span className="rounded-full bg-navy-900/10 px-3 py-1 text-xs font-bold text-navy-800">
            대기 청크 {queueDepth}개
            {sessionSecondsLeft !== null && ` · 자동 종료까지 ${sessionSecondsLeft}초`}
          </span>
        )}

        {entries.length > 0 && (
          <div className="ml-auto">
            <button
              type="button"
              onClick={handleCopyAll}
              className="rounded-md border border-navy-900/15 px-4 py-2 text-sm font-bold text-navy-800/70 transition-colors hover:border-gold-500 hover:text-gold-600"
            >
              {copyFeedback ?? "전체 자막 복사"}
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 min-h-[40vh] flex-1 rounded-2xl bg-navy-950 px-6 py-8 sm:px-10">
        {entries.length === 0 && processingChunkId === null ? (
          <p className="text-center text-xl text-white/40 sm:text-2xl">
            상담을 시작하면 이 화면에 자막이 표시됩니다.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {entries.map((entry) => (
              <p key={entry.id} className="text-2xl font-bold leading-snug text-white/90 sm:text-3xl">
                {entry.text}
              </p>
            ))}
            {processingChunkId !== null && (
              <p className="text-xl font-semibold italic leading-snug text-white/40 sm:text-2xl">
                처리 중 (청크 #{processingChunkId})...
              </p>
            )}
          </div>
        )}
      </div>

      <details className="mt-4 rounded-md border border-navy-900/10 px-4 py-3 text-xs text-navy-800/70">
        <summary className="cursor-pointer font-semibold text-navy-800/50">진단 정보</summary>
        <div className="mt-3 flex flex-col gap-2">
          <p>
            WebGPU 지원 여부: <strong>{String(webgpuSupported)}</strong> · 실제 device:{" "}
            <strong>{device ?? "-"}</strong>
          </p>
          <p>
            모델 로딩 시간: <strong>{loadMs !== null ? `${loadMs}ms` : "-"}</strong> · 다운로드 용량:{" "}
            <strong>{downloadBytes !== null ? formatBytes(downloadBytes) : "-"}</strong>
          </p>
          <p>
            청크 길이: <strong>{CHUNK_MS / 1000}초</strong> · 메모리 사용량:{" "}
            <strong>{getMemoryInfoLabel()}</strong>
          </p>
        </div>
      </details>

      {diagnosticsLog.length > 0 && (
        <div className="mt-3 max-h-56 overflow-y-auto rounded-md bg-navy-950 px-3 py-2">
          <p className="mb-1 text-[11px] font-semibold text-white/40">
            로컬 추론 로그 (진단용, 다른 모드와 무관)
          </p>
          {diagnosticsLog.map((entry, index) => (
            <p key={index} className="font-mono text-[11px] leading-relaxed text-white/70">
              <span className="text-white/40">{entry.time}</span> {entry.message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
