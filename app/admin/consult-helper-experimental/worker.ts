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

/**
 * Whisper는 transformers.js 내부적으로 Seq2Seq 모델 타입이라, 세션 키가
 * 파일명과 다릅니다(라이브러리 소스 MODEL_SESSION_CONFIG 확인):
 *   sessions: () => ({ model: "encoder_model", decoder_model_merged: "decoder_model_merged" })
 * 즉 인코더는 파일명이 encoder_model.onnx여도 dtype 객체의 키는
 * "encoder_model"이 아니라 "model"이어야 합니다. decoder_model_merged는
 * 키/파일명이 같습니다.
 *
 * 실기기 오류(TransposedDQWeightsForMatMulNBits Missing required scale,
 * model.decoder.embed_tokens...)는 q8(=_quantized 접미사) 디코더 파일
 * 자체의 양자화 손상으로 판단해, 디코더만 fp32로 우회합니다. encoder는
 * q8 그대로 둡니다.
 */
const MODULE_DTYPE = {
  model: "q8",
  decoder_model_merged: "fp32",
} as const;

type Transcriber = AutomaticSpeechRecognitionPipeline;

let transcriberPromise: Promise<Transcriber> | null = null;

function post(message: WorkerToMainMessage): void {
  (self as unknown as Worker).postMessage(message);
}

/**
 * pipeline()을 부르기 전에 실제 GPU 어댑터 획득을 먼저 시도해 device를
 * 단 한 번만 확정합니다. transformers.js는 세션 생성을 Worker 전역
 * 싱글턴 Promise 체인(webInitChain)으로 관리해서, 같은 Worker 안에서
 * 실패 후 다른 device로 재시도하면 그 체인이 이미 reject된 상태라 두
 * 번째 시도가 전혀 실행되지 않고 첫 번째 에러가 그대로 다시 던져지는
 * 것을 실제로 확인했습니다 — 그래서 재시도 없이 사전 검증만 합니다.
 */
async function resolveDevice(): Promise<DeviceKind> {
  const hasWebGpuApi = typeof navigator !== "undefined" && "gpu" in navigator;
  post({ type: "log", message: `WebGPU API 존재 여부: ${hasWebGpuApi}` });

  if (!hasWebGpuApi) {
    post({ type: "log", message: "WebGPU API 없음 → wasm 선택" });
    return "wasm";
  }

  try {
    const adapter = await navigator.gpu?.requestAdapter();
    if (adapter) {
      post({ type: "log", message: "requestAdapter 성공 → webgpu 선택" });
      return "webgpu";
    }
    post({ type: "log", message: "requestAdapter 결과 null → wasm 선택" });
    return "wasm";
  } catch (err) {
    const name = err instanceof Error ? err.name : "UnknownError";
    const message = err instanceof Error ? err.message : String(err);
    post({ type: "log", message: `requestAdapter 예외(${name}: ${message}) → wasm 선택` });
    return "wasm";
  }
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
  post({
    type: "log",
    message: `모델/dtype: ${MODEL_ID}, model(encoder)=${MODULE_DTYPE.model}, decoder_model_merged=${MODULE_DTYPE.decoder_model_merged}`,
  });
  return pipeline("automatic-speech-recognition", MODEL_ID, {
    device,
    dtype: MODULE_DTYPE,
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

  // device는 여기서 단 한 번만 정해지고, 이 Worker 안에서 다시 바뀌지 않습니다.
  const device = await resolveDevice();
  post({ type: "log", message: `최종 선택 device: ${device}` });

  const transcriber = await createTranscriber(device, onFileTotal);

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
