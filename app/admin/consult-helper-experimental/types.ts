/**
 * 메인 스레드 ↔ Worker 메시지 타입. 기존 consult-helper(무료/유료 모드)와는
 * 완전히 독립된 실험용 페이지라, 어떤 파일도 공유하지 않습니다.
 */

export type DeviceKind = "webgpu" | "wasm";

export type MainToWorkerMessage =
  | { type: "load" }
  | { type: "transcribe"; chunkId: number; audio: Float32Array };

export type WorkerToMainMessage =
  | { type: "loading-progress"; file: string; loaded: number; total: number }
  | { type: "ready"; device: DeviceKind; loadMs: number; downloadBytes: number }
  | { type: "result"; chunkId: number; text: string; inferenceMs: number }
  | {
      type: "error";
      scope: "load" | "transcribe";
      chunkId?: number;
      name: string;
      message: string;
    };
