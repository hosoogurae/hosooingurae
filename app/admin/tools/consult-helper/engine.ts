import type { TranscriptState } from "./transcript";

/**
 * 무료(Web Speech API) / 고정확도(OpenAI Realtime) 두 엔진이 공유하는
 * 인터페이스입니다. page.tsx는 이 타입만 알면 되고, 어떤 엔진이 실제로
 * 동작하는지는 신경 쓰지 않습니다 — 자막 데이터 구조(transcript.ts)도
 * 두 엔진이 동일하게 사용합니다.
 *
 * connecting/error는 OpenAI 모드에서만 실제로 쓰입니다(토큰 발급 +
 * WebRTC 연결에 시간이 걸리고 실패할 수 있음). reconnecting도 OpenAI
 * 모드 전용(연결이 끊겨 최대 2회까지 자동 재연결을 시도하는 중). 무료
 * 모드는 이 상태들을 쓰지 않을 뿐 타입은 그대로 호환됩니다.
 */
export type ConsultStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "paused"
  | "reconnecting"
  | "ended"
  | "error";

export interface ConsultSessionSummary {
  elapsedSeconds: number;
  /** 리서치 시점 단가 기준 추정치. 실제 청구와 다를 수 있습니다. */
  estimatedCostUsd: number;
}

/**
 * OpenAI Realtime의 turn_detection 설정 — 정확도 비교 테스트를 위해 화면에서
 * 쉽게 전환할 수 있도록 두 프리셋만 둡니다("server_vad_default"가 기존
 * 동작과 동일한 원래 설정이라 언제든 되돌릴 수 있습니다).
 */
export type TurnDetectionMode = "server_vad_default" | "semantic_vad_low";

export interface TranscriptionEngine {
  status: ConsultStatus;
  isSupported: boolean;
  transcript: TranscriptState;
  errorMessage: string | null;
  /** 고정확도 모드에서만 값이 있음(진행 중 경과 초). */
  elapsedSeconds?: number;
  /** 고정확도 모드에서 stop() 직후에만 채워지는 이번 상담 요약. */
  lastSessionSummary?: ConsultSessionSummary | null;
  /** 마이크 음량 게이지가 재사용할 스트림. 무료 모드는 없음(항상 undefined). */
  micStream?: MediaStream | null;
  /** 고정확도 모드에서만 값이 있음 — 디버그 패널에 표시할 실제 사용 모델명. */
  modelLabel?: string | null;
  /** 고정확도 모드 전용. 현재 적용된 turn_detection 프리셋. */
  turnDetectionMode?: TurnDetectionMode;
  /** 고정확도 모드 전용. 다음 start() 호출부터 적용될 프리셋을 바꿉니다. */
  setTurnDetectionMode?: (mode: TurnDetectionMode) => void;
  /** 고정확도 모드 전용. 지금까지 이 세션에서 자동 재연결을 시도한 횟수(0~2). */
  reconnectAttempt?: number;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  clear: () => void;
}
