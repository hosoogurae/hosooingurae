/// <reference lib="webworker" />
import { env, pipeline, type AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";
import type { DeviceKind, MainToWorkerMessage, WorkerToMainMessage } from "./types";

// 이 배포는 Cross-Origin-Opener-Policy/Cross-Origin-Embedder-Policy 헤더가
// 없어 crossOriginIsolated가 false입니다. onnxruntime-web의 기본(멀티스레드)
// WASM 백엔드는 SharedArrayBuffer가 필요해 이런 환경에서 초기화 자체가
// 실패("no available backend found")합니다. 싱글스레드로 강제해 그 요구사항을
// 없앱니다. (WebGPU/WASM 자동 폴백 실험 중 실제로 재현·확인된 원인입니다.)
if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
}

/**
 * 브라우저 로컬 Whisper 추론 전담 Worker. 모델 로딩·추론을 전부 여기서
 * 처리해 메인 스레드(UI)가 멈추지 않게 합니다(공식 Next.js 가이드 권장 구조:
 * https://huggingface.co/docs/transformers.js/tutorials/next).
 */

// 다국어(한국어 포함) 최소 모델, 양자화 버전 우선. .en(영어 전용) 모델은
// 쓰지 않습니다.
const MODEL_ID = "onnx-community/whisper-tiny";

type Transcriber = AutomaticSpeechRecognitionPipeline;

let transcriberPromise: Promise<Transcriber> | null = null;

function post(message: WorkerToMainMessage): void {
  (self as unknown as Worker).postMessage(message);
}

function detectPreferredDevice(): DeviceKind {
  return typeof navigator !== "undefined" && "gpu" in navigator ? "webgpu" : "wasm";
}

interface RawProgressEvent {
  status?: string;
  file?: string;
  loaded?: number;
  total?: number;
}

async function createTranscriber(
  device: DeviceKind,
  onFileTotal: (file: string, total: number) => void,
): Promise<Transcriber> {
  return pipeline("automatic-speech-recognition", MODEL_ID, {
    device,
    dtype: "q8", // 양자화(8bit) 모델 우선
    progress_callback: (progress: unknown) => {
      const p = progress as RawProgressEvent;
      if (p.status === "progress" && typeof p.file === "string" && typeof p.total === "number") {
        onFileTotal(p.file, p.total);
        post({
          type: "loading-progress",
          file: p.file,
          loaded: typeof p.loaded === "number" ? p.loaded : 0,
          total: p.total,
        });
      }
    },
  });
}

async function loadModel(): Promise<Transcriber> {
  const startedAt = performance.now();
  const fileTotals = new Map<string, number>();
  const onFileTotal = (file: string, total: number) => fileTotals.set(file, total);

  const preferredDevice = detectPreferredDevice();
  let device = preferredDevice;
  let transcriber: Transcriber;
  try {
    transcriber = await createTranscriber(device, onFileTotal);
  } catch (firstErr) {
    const firstName = firstErr instanceof Error ? firstErr.name : "UnknownError";
    const firstMessage = firstErr instanceof Error ? firstErr.message : String(firstErr);
    post({ type: "log", message: `${device} 로딩 실패: ${firstName} - ${firstMessage}` });

    if (device !== "webgpu") {
      throw firstErr;
    }

    // WebGPU 실패 시 WASM으로 폴백.
    device = "wasm";
    post({ type: "log", message: "wasm으로 재시도" });
    try {
      transcriber = await createTranscriber(device, onFileTotal);
    } catch (secondErr) {
      const secondName = secondErr instanceof Error ? secondErr.name : "UnknownError";
      const secondMessage = secondErr instanceof Error ? secondErr.message : String(secondErr);
      post({ type: "log", message: `wasm 로딩도 실패: ${secondName} - ${secondMessage}` });
      throw new Error(
        `WebGPU 실패(${firstName}: ${firstMessage}) 후 WASM도 실패(${secondName}: ${secondMessage})`,
      );
    }
  }

  const loadMs = performance.now() - startedAt;
  const downloadBytes = [...fileTotals.values()].reduce((sum, total) => sum + total, 0);
  post({ type: "ready", device, loadMs, downloadBytes });
  return transcriber;
}

self.addEventListener("message", async (event: MessageEvent<MainToWorkerMessage>) => {
  const data = event.data;
  try {
    if (data.type === "load") {
      if (!transcriberPromise) {
        transcriberPromise = loadModel();
      }
      await transcriberPromise;
      return;
    }

    if (data.type === "transcribe") {
      if (!transcriberPromise) {
        throw new Error("모델이 아직 로드되지 않았습니다.");
      }
      const transcriber = await transcriberPromise;
      const startedAt = performance.now();
      const output = await transcriber(data.audio, { language: "ko", task: "transcribe" });
      const inferenceMs = performance.now() - startedAt;
      const text = Array.isArray(output)
        ? output.map((item) => ("text" in item ? item.text : "")).join(" ")
        : "text" in output
          ? output.text
          : "";
      post({ type: "result", chunkId: data.chunkId, text: text ?? "", inferenceMs });
    }
  } catch (err) {
    post({
      type: "error",
      scope: data.type === "transcribe" ? "transcribe" : "load",
      chunkId: data.type === "transcribe" ? data.chunkId : undefined,
      name: err instanceof Error ? err.name : "UnknownError",
      message: err instanceof Error ? err.message : String(err),
    });
  }
});
