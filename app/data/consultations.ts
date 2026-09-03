export type ConsultationMode = "manual" | "free" | "openai";
export type ConsultationStatus = "in_progress" | "ended" | "discarded";
export type TranscriptSpeaker = "agent" | "customer" | "unknown";
export type FieldConfidence = "confirmed" | "uncertain";
export type ConsultationTaskStatus = "open" | "done";

/** 희망조건 값의 저장 형태 — 가격(숫자), 날짜, 배열, 객체 등 문자열로 억지로 우겨넣지 않습니다. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue | undefined };

/**
 * 상담 종료 후 붙이는 자유 태그의 추천 목록(UI에서 한 번에 고를 수 있는
 * 예시일 뿐, DB에는 이 값으로 제한하는 체크 제약이 없습니다 — 직접 입력한
 * 다른 태그도 그대로 저장됩니다).
 */
export const SUGGESTED_CONSULTATION_TAGS = [
  "신혼부부",
  "투자",
  "급매",
  "반려동물",
  "어린이",
  "법인",
  "재방문",
  "매매",
  "전세",
  "월세",
] as const;

export interface ConsultationTranscriptEntry {
  id: string;
  consultationId: string;
  speaker: TranscriptSpeaker;
  text: string;
  correctedText?: string;
  sortOrder: number;
  finalizedAt: string;
}

export interface ConsultationExtractedField {
  id: string;
  consultationId: string;
  fieldKey: string;
  fieldValue: JsonValue;
  confidence: FieldConfidence;
  updatedAt: string;
}

export interface ConsultationTask {
  id: string;
  consultationId?: string;
  customerId?: string;
  taskType: string;
  description: string;
  dueDate?: string;
  status: ConsultationTaskStatus;
  createdAt: string;
  updatedAt: string;
}

/** 상담 종료 시 확정되는 후속조치 스냅샷 한 건(consultations.follow_up_tasks jsonb). */
export interface FollowUpTaskDraft {
  description: string;
  dueDate?: string;
}

export interface Consultation {
  id: string;
  customerId?: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
  mode: ConsultationMode;
  status: ConsultationStatus;
  /** 확정 전사(상담 중 기록된 메모를 순서대로 이어붙인 스냅샷). 종료 시점에 채워집니다. */
  transcript?: string;
  /** 사람이 고친 버전. 없으면 transcript와 같다고 간주합니다. */
  correctedTranscript?: string;
  summary?: string;
  /** 종료 시점에 확정된 희망조건 스냅샷(키-값, 값은 문자열/숫자/배열/객체 모두 가능). */
  extractedConditions: Record<string, JsonValue>;
  /** 종료 시점에 확신도가 낮았던 항목의 field_key 목록. */
  uncertainFields: string[];
  /** 종료 시점에 확정된 후속조치 설명 목록(스냅샷 — 실제 체크는 consultation_tasks에서). */
  followUpTasks: string[];
  smsDraft?: string;
  internalMemo?: string;
  /** 신혼부부/투자/급매/반려동물/재방문 등 자유 태그. 나중에 태그로 고객·상담을 검색하는 데 씁니다. */
  tags: string[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

/** 목록 화면용 — 고객 이름/연락처를 조인해서 함께 내려줍니다. */
export interface ConsultationSummary extends Consultation {
  customerName?: string;
  customerPhone?: string;
}

/** 상세 화면용 — 진행 중 기록된 원본들을 함께 내려줍니다. */
export interface ConsultationDetail extends ConsultationSummary {
  transcripts: ConsultationTranscriptEntry[];
  extractedFieldsList: ConsultationExtractedField[];
  tasks: ConsultationTask[];
}

/** POST /api/admin/consultations 요청 바디. */
export interface ConsultationStartInput {
  customerId?: string;
}

/**
 * PATCH /api/admin/consultations/:id 요청 바디("상담 진행" 중 자동저장).
 * 값이 있는 필드만 반영되고, 없는 필드는 기존 값을 그대로 둡니다.
 */
export interface ConsultationUpdateInput {
  customerId?: string | null;
  internalMemo?: string;
  smsDraft?: string;
  /** 새로 기록할 메모/발화를 순서대로 추가합니다(기존 항목은 그대로 유지). */
  appendTranscript?: { speaker: TranscriptSpeaker; text: string }[];
  /** field_key 기준으로 upsert합니다(같은 키를 다시 보내면 값/확신도만 갱신). */
  extractedFields?: { fieldKey: string; fieldValue: JsonValue; confidence?: FieldConfidence }[];
  /** 이 field_key들은 삭제합니다(잘못 입력한 항목 제거용). */
  removeExtractedFieldKeys?: string[];
  /** 상담 진행 중에도 태그를 미리 붙이거나 뗄 수 있게 허용합니다(주로는 종료 시 확정). */
  tags?: string[];
}

/** POST /api/admin/consultations/:id/end 요청 바디("상담 종료" 확정 저장). */
export interface ConsultationEndInput {
  durationSeconds?: number;
  summary?: string;
  correctedTranscript?: string;
  extractedConditions?: Record<string, JsonValue>;
  uncertainFields?: string[];
  followUpTasks?: FollowUpTaskDraft[];
  smsDraft?: string;
  internalMemo?: string;
  /** 예: 신혼부부, 투자, 급매, 반려동물, 재방문 — SUGGESTED_CONSULTATION_TAGS 참고. */
  tags?: string[];
}

/** POST/PATCH consultation-tasks 요청 바디. */
export interface ConsultationTaskInput {
  consultationId?: string;
  customerId?: string;
  taskType?: string;
  description: string;
  dueDate?: string;
}

export interface ConsultationTaskUpdateInput {
  description?: string;
  dueDate?: string | null;
  status?: ConsultationTaskStatus;
}
