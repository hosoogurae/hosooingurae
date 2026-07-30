"use client";

import { useState } from "react";
import TranscriptView, { type FontScale } from "./TranscriptView";
import { useSpeechTranscription } from "./useSpeechTranscription";
import { useOpenAiRealtimeTranscription } from "./useOpenAiRealtimeTranscription";
import { useMicLevel } from "./useMicLevel";
import { useMicPermission } from "./useMicPermission";
import type { TranscriptionEngine } from "./engine";

const FONT_SCALE_OPTIONS: { value: FontScale; label: string }[] = [
  { value: "normal", label: "보통" },
  { value: "large", label: "크게" },
  { value: "xlarge", label: "아주 크게" },
];

const STATUS_LABEL: Record<string, string> = {
  idle: "대기 중",
  connecting: "연결 중",
  listening: "듣는 중",
  paused: "일시정지",
  reconnecting: "재연결 중",
  ended: "종료됨",
  error: "오류",
};

const MIC_PERMISSION_LABEL: Record<string, string> = {
  granted: "허용됨",
  denied: "차단됨",
  prompt: "아직 묻지 않음",
  unsupported: "이 브라우저에서 확인 불가",
};

type Mode = "free" | "openai";

/** 리서치 시점 대략적인 환산용 환율. 실제 환율에 따라 달라질 수 있습니다. */
const APPROX_KRW_PER_USD = 1400;

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatCost(usd: number): string {
  const krw = Math.round(usd * APPROX_KRW_PER_USD);
  return `$${usd.toFixed(3)} (약 ${krw.toLocaleString()}원)`;
}

export default function ConsultHelperPage() {
  // 청력 보조가 목적이라 기본값을 "보통"보다 한 단계 위로 시작합니다.
  const [fontScale, setFontScale] = useState<FontScale>("large");
  const [mode, setMode] = useState<Mode>("free");
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const freeEngine = useSpeechTranscription();
  const openAiEngine = useOpenAiRealtimeTranscription();
  const engine: TranscriptionEngine = mode === "free" ? freeEngine : openAiEngine;
  const micPermission = useMicPermission();

  const canChangeMode =
    engine.status === "idle" || engine.status === "ended" || engine.status === "error";
  const isActiveSession =
    engine.status === "listening" || engine.status === "paused" || engine.status === "reconnecting";

  const micLevel = useMicLevel(isActiveSession, engine.micStream ?? null);

  function handleClear() {
    if (engine.transcript.entries.length === 0) {
      engine.clear();
      return;
    }
    if (confirm("지금까지의 자막을 전부 지울까요? 되돌릴 수 없습니다.")) {
      engine.clear();
    }
  }

  async function handleCopyTranscript() {
    const fullText = engine.transcript.entries.map((entry) => entry.text).join("\n");
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
      <p className="text-sm font-semibold tracking-wide text-gold-600">ADMIN</p>
      <h1 className="mt-2 text-2xl font-black text-navy-950 sm:text-3xl">
        상담 도우미
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-navy-800/70">
        고객과 대면 상담할 때, 컴퓨터 마이크로 들은 말을 큰 글씨 자막으로
        보여줍니다.
      </p>

      <div className="mt-5 flex items-center gap-2">
        <span className="text-xs font-semibold text-navy-800/50">인식 방식</span>
        <button
          type="button"
          disabled={!canChangeMode}
          onClick={() => setMode("free")}
          className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            mode === "free"
              ? "bg-navy-950 text-white"
              : "bg-navy-900/5 text-navy-800 hover:bg-navy-900/10"
          }`}
        >
          무료 모드
        </button>
        <button
          type="button"
          disabled={!canChangeMode}
          onClick={() => setMode("openai")}
          className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            mode === "openai"
              ? "bg-gold-600 text-white"
              : "bg-navy-900/5 text-navy-800 hover:bg-navy-900/10"
          }`}
        >
          고정확도 모드 (유료)
        </button>
      </div>

      <div
        className={`mt-3 rounded-md border px-4 py-3 text-xs leading-relaxed ${
          engine.isSupported
            ? "border-navy-900/10 bg-navy-900/5 text-navy-800/60"
            : "border-red-300 bg-red-50 text-red-700"
        }`}
      >
        {!engine.isSupported ? (
          mode === "free" ? (
            <>
              이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 또는 Edge
              최신 버전에서 이 화면을 열어주세요.
            </>
          ) : (
            <>이 브라우저는 고정확도 모드에 필요한 기능을 지원하지 않습니다.</>
          )
        ) : mode === "free" ? (
          <>
            이 화면은 브라우저 내장 음성인식을 사용해 참고용 자막을
            보여줍니다. 인터넷 연결이 필요하고, 여러 사람의 말을 구분하지
            않으며, 부동산 용어·가격·날짜를 잘못 알아들을 수 있으니 중요한
            숫자는 꼭 다시 확인하세요. 자막은 저장되지 않으며 새로고침하거나
            다른 화면으로 이동하면 사라집니다. Chrome 또는 Edge 최신 버전
            사용을 권장합니다.
          </>
        ) : (
          <>
            고정확도 모드는 마이크 음성을 실시간으로 OpenAI 서버로 전송해
            처리합니다(오디오 원본은 저장되지 않고 전송만 됩니다). 사용한
            시간만큼 비용이 발생하며, 인터넷 연결이 필요합니다. 자막은 이
            화면을 벗어나면 사라지고 저장되지 않습니다.
          </>
        )}
      </div>

      {micPermission === "denied" && (
        <div className="mt-3 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-700">
          마이크 권한이 차단되어 있어요. 브라우저 주소창 왼쪽의 자물쇠(또는
          마이크) 아이콘을 눌러 마이크 권한을 &quot;허용&quot;으로 바꾼 뒤, 이 페이지를
          새로고침해주세요.
        </div>
      )}

      {engine.errorMessage && (
        <div className="mt-3 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {engine.errorMessage}
        </div>
      )}

      {engine.status === "error" && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => engine.start()}
            className="rounded-md bg-gradient-to-r from-gold-500 to-gold-600 px-5 py-2.5 text-sm font-bold text-navy-950 shadow-md shadow-gold-500/30"
          >
            다시 시도
          </button>
          <button
            type="button"
            onClick={() => setMode("free")}
            className="rounded-md border border-navy-900/15 px-5 py-2.5 text-sm font-bold text-navy-800 transition-colors hover:border-gold-500 hover:text-gold-600"
          >
            무료 모드로 전환
          </button>
        </div>
      )}

      {mode === "openai" && (engine.status === "listening" || engine.status === "paused") && (
        <div className="mt-3 flex items-center gap-2 rounded-full bg-gold-500/10 px-4 py-2 text-xs font-bold text-gold-700 w-fit">
          <span>💰 유료 고정확도 모드 사용 중</span>
          <span>·</span>
          <span>{formatElapsed(engine.elapsedSeconds ?? 0)}</span>
        </div>
      )}

      {mode === "openai" && engine.status === "reconnecting" && (
        <div className="mt-3 flex items-center gap-2 rounded-full bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-700 w-fit">
          <span>🔄 재연결 중... ({engine.reconnectAttempt ?? 0}/2)</span>
        </div>
      )}

      {mode === "openai" && engine.status === "ended" && engine.lastSessionSummary && (
        <div className="mt-3 rounded-md border border-gold-500/30 bg-gold-500/5 px-4 py-3 text-sm text-navy-900">
          이번 상담 사용 시간: {formatElapsed(engine.lastSessionSummary.elapsedSeconds)} ·
          예상 비용: {formatCost(engine.lastSessionSummary.estimatedCostUsd)}
          <span className="mt-1 block text-xs text-navy-800/50">
            예상 비용은 리서치 시점 단가 기준 추정치이며 실제 청구와 다를 수
            있습니다. 정확한 금액은 OpenAI 계정에서 확인해주세요.
          </span>
        </div>
      )}

      {isActiveSession && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs font-semibold text-navy-800/50">마이크 음량</span>
          <div className="h-2 w-40 overflow-hidden rounded-full bg-navy-900/10">
            <div
              className="h-full rounded-full bg-green-500 transition-[width] duration-100"
              style={{ width: `${Math.round(micLevel * 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {engine.status === "idle" && (
          <button
            type="button"
            onClick={engine.start}
            disabled={!engine.isSupported}
            className="rounded-md bg-gradient-to-r from-gold-500 to-gold-600 px-8 py-4 text-lg font-black text-navy-950 shadow-md shadow-gold-500/30 transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
          >
            상담 시작
          </button>
        )}

        {(engine.status === "connecting" || engine.status === "reconnecting") && (
          <span className="rounded-md border border-navy-900/15 px-5 py-3 text-base font-bold text-navy-800/60">
            {engine.status === "reconnecting" ? "재연결 중..." : "연결 중..."}
          </span>
        )}

        {engine.status === "listening" && (
          <>
            <button
              type="button"
              onClick={engine.pause}
              className="rounded-md border border-navy-900/15 px-5 py-3 text-base font-bold text-navy-800 transition-colors hover:border-gold-500 hover:text-gold-600"
            >
              일시정지
            </button>
            <button
              type="button"
              onClick={engine.stop}
              className="rounded-md border border-red-200 px-5 py-3 text-base font-bold text-red-600 transition-colors hover:bg-red-50"
            >
              상담 종료
            </button>
          </>
        )}

        {engine.status === "paused" && (
          <>
            <span className="rounded-full bg-navy-900/10 px-3 py-1 text-xs font-bold text-navy-800">
              일시정지됨
            </span>
            <button
              type="button"
              onClick={engine.resume}
              className="rounded-md bg-gradient-to-r from-gold-500 to-gold-600 px-5 py-3 text-base font-black text-navy-950 shadow-md shadow-gold-500/30 transition-transform hover:scale-[1.01]"
            >
              다시 시작
            </button>
            <button
              type="button"
              onClick={engine.stop}
              className="rounded-md border border-red-200 px-5 py-3 text-base font-bold text-red-600 transition-colors hover:bg-red-50"
            >
              상담 종료
            </button>
          </>
        )}

        {engine.status === "ended" && (
          <button
            type="button"
            onClick={engine.start}
            disabled={!engine.isSupported}
            className="rounded-md bg-gradient-to-r from-gold-500 to-gold-600 px-8 py-4 text-lg font-black text-navy-950 shadow-md shadow-gold-500/30 transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
          >
            새 상담 시작
          </button>
        )}

        {(engine.status === "listening" ||
          engine.status === "paused" ||
          engine.status === "ended" ||
          engine.status === "error") && (
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyTranscript}
              className="rounded-md border border-navy-900/15 px-4 py-2 text-sm font-bold text-navy-800/70 transition-colors hover:border-gold-500 hover:text-gold-600"
            >
              {copyFeedback ?? "전체 자막 복사"}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="rounded-md border border-navy-900/15 px-4 py-2 text-sm font-bold text-navy-800/70 transition-colors hover:border-red-300 hover:text-red-600"
            >
              전체 자막 지우기
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <span className="text-xs font-semibold text-navy-800/50">글씨 크기</span>
        {FONT_SCALE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFontScale(option.value)}
            className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
              fontScale === option.value
                ? "bg-navy-950 text-white"
                : "bg-navy-900/5 text-navy-800 hover:bg-navy-900/10"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <details className="mt-4 rounded-md border border-navy-900/10 px-4 py-3 text-xs text-navy-800/70">
        <summary className="cursor-pointer font-semibold text-navy-800/50">
          디버그 정보
        </summary>
        <div className="mt-3 flex flex-col gap-2">
          <p>
            현재 모드: <strong>{mode === "free" ? "무료(Web Speech API)" : "고정확도(OpenAI Realtime)"}</strong>
            {mode === "openai" && openAiEngine.modelLabel && (
              <> · 모델: <strong>{openAiEngine.modelLabel}</strong></>
            )}
          </p>
          <p>
            연결 상태: <strong>{STATUS_LABEL[engine.status] ?? engine.status}</strong>
            {mode === "openai" && (
              <> · 자동 재연결 시도: <strong>{openAiEngine.reconnectAttempt ?? 0}/2</strong></>
            )}
          </p>
          <p>
            마이크 권한: <strong>{MIC_PERMISSION_LABEL[micPermission] ?? micPermission}</strong>
          </p>
        </div>
      </details>

      <div className="mt-4 flex flex-1 flex-col">
        <TranscriptView transcript={engine.transcript} fontScale={fontScale} />
      </div>
    </div>
  );
}
