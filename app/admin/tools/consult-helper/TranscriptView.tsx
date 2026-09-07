"use client";

import { useEffect, useRef } from "react";
import type { TranscriptState } from "./transcript";

export type FontScale = "normal" | "large" | "xlarge";

const FONT_PRESETS: Record<
  FontScale,
  { latest: string; interim: string; history: string }
> = {
  normal: {
    latest: "text-4xl sm:text-5xl",
    interim: "text-3xl sm:text-4xl",
    history: "text-xl sm:text-2xl",
  },
  large: {
    latest: "text-5xl sm:text-6xl",
    interim: "text-4xl sm:text-5xl",
    history: "text-2xl sm:text-3xl",
  },
  xlarge: {
    latest: "text-6xl sm:text-7xl",
    interim: "text-5xl sm:text-6xl",
    history: "text-3xl sm:text-4xl",
  },
};

/**
 * 자막 표시 전용 컴포넌트. transcript 상태를 받아 그리기만 하고,
 * SpeechRecognition 등 브라우저 API는 전혀 알지 못합니다.
 */
export default function TranscriptView({
  transcript,
  fontScale,
}: {
  transcript: TranscriptState;
  fontScale: FontScale;
}) {
  const preset = FONT_PRESETS[fontScale];
  const scrollRef = useRef<HTMLDivElement>(null);
  const entries = transcript.entries;
  const latest = entries[entries.length - 1];
  const history = entries.slice(0, -1);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [entries.length, transcript.interimText]);

  const isEmpty = entries.length === 0 && !transcript.interimText;

  return (
    <div
      ref={scrollRef}
      className="min-h-[50vh] flex-1 overflow-y-auto rounded-2xl bg-navy-950 px-6 py-8 sm:px-10"
    >
      {isEmpty ? (
        <p className="text-center text-xl text-white/40 sm:text-2xl">
          상담을 시작하면 이 화면에 자막이 표시됩니다.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {history.map((entry) => (
            <p
              key={entry.id}
              className={`${preset.history} font-bold leading-snug text-white/60`}
            >
              {entry.text}
            </p>
          ))}
          {latest && (
            <p
              className={`${preset.latest} font-black leading-tight text-gold-400`}
            >
              {latest.text}
            </p>
          )}
          {transcript.interimText && (
            <p
              className={`${preset.interim} font-semibold italic leading-snug text-white/50`}
            >
              {transcript.interimText}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
