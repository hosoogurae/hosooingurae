"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export default function ListingInquiryMessage({ message }: { message: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 권한이 없는 환경 등은 조용히 무시합니다(문구는 이미 화면에 보임).
    }
  }

  return (
    <div className="rounded-xl border border-white/15 bg-white/5 p-4 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <p className="whitespace-pre-line text-sm leading-relaxed text-white/80">
          {message}
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-white/30 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:border-gold-400 hover:text-gold-400"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              복사됨
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" strokeWidth={2} />
              복사
            </>
          )}
        </button>
      </div>
      <p className="mt-2 text-xs text-white/40">
        전화·카카오톡 문의 시 이 내용을 복사해 함께 전달하면 상담이 빨라집니다.
      </p>
    </div>
  );
}
