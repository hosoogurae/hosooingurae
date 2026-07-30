// TS의 lib.dom.d.ts에는 SpeechRecognitionAlternative/Result/ResultList는 이미 있지만
// SpeechRecognition 본체·이벤트·Window 확장은 표준이 아니라 빠져있어 여기서만 보강합니다.
// import/export가 없어야 전역 ambient 선언으로 인식됩니다.

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: SpeechRecognition) => void) | null;
  onstart: ((this: SpeechRecognition) => void) | null;
}

// eslint-disable-next-line no-var -- 생성자+인터페이스 선언 병합에는 var가 필요한 TS 표준 관용구
declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new (): SpeechRecognition;
};

interface Window {
  SpeechRecognition?: typeof SpeechRecognition;
  webkitSpeechRecognition?: typeof SpeechRecognition;
}
