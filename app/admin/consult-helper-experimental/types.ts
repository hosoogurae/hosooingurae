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
  | { type: "ready"; device: DeviceKind; loadMs: number; downloadBytes: number; warmupMs: number }
  | { type: "result"; chunkId: number; text: string; inferenceMs: number }
  | {
      type: "error";
      scope: "load" | "transcribe";
      chunkId?: number;
      name: string;
      message: string;
    }
  /** 진단용 자유 텍스트 로그(예: WebGPU 시도 실패 뒤 WASM으로 넘어가는
   * 중간 과정) — 최종 실패로 취급하지 않고 화면 로그에만 남깁니다. */
  | { type: "log"; message: string };
