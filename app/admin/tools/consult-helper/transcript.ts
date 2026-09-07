/**
 * 자막 데이터 모델. 브라우저 API(SpeechRecognition 등)를 전혀 import하지
 * 않는 순수 타입/함수만 둡니다 — 나중에 다른 STT 엔진(모바일 앱 등)으로
 * 교체하더라도 이 모델과 화면 표시 로직은 그대로 재사용할 수 있게 하기
 * 위해서입니다.
 */

export interface TranscriptEntry {
  id: string;
  /** 인식된 원문 그대로. AI가 요약하거나 숫자/가격을 고치지 않습니다. */
  text: string;
  finalizedAt: number;
}

export interface TranscriptState {
  /** 확정된 문장들. 오래된 것 → 최신 순. */
  entries: TranscriptEntry[];
  /** 아직 확정되지 않은, 지금 인식 중인 텍스트. 없으면 빈 문자열. */
  interimText: string;
}

export const EMPTY_TRANSCRIPT_STATE: TranscriptState = {
  entries: [],
  interimText: "",
};

export function appendFinalEntry(
  state: TranscriptState,
  text: string,
): TranscriptState {
  const trimmed = text.trim();
  if (!trimmed) return { ...state, interimText: "" };

  const entry: TranscriptEntry = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    text: trimmed,
    finalizedAt: Date.now(),
  };
  return { entries: [...state.entries, entry], interimText: "" };
}

export function setInterimText(
  state: TranscriptState,
  text: string,
): TranscriptState {
  return { ...state, interimText: text };
}

export function clearTranscript(): TranscriptState {
  return { entries: [], interimText: "" };
}
