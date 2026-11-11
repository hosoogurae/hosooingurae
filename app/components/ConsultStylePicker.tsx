"use client";

import { useState } from "react";
import { PHONE_HREF, PHONE_NUMBER } from "../data/contact";
import type { ConsultStyle } from "../lib/consultPhones";
import { isMobileDevice } from "../lib/listingInquiry";
import ActionModal from "./ActionModal";

/**
 * 홈 하단(ContactCta)의 「나랑 맞는 상담 스타일 고르기」 버튼과 모달.
 *
 * 번호는 이 컴포넌트에 props로 들어오지 않습니다 — 손님이 선택지를 누른
 * 순간에 POST /api/consult-phone으로 받아옵니다(페이지 HTML에 번호가 박히지
 * 않게). 아무것도 저장하지 않습니다.
 *
 * 이 컴포넌트는 ContactCta가 isConsultPickerEnabled()로 두 번호가 모두
 * 설정된 걸 확인했을 때만 렌더링됩니다.
 */

const OPTIONS: {
  style: ConsultStyle;
  label: string;
  tag: string;
  descriptions: string[];
}[] = [
  {
    style: "fact",
    label: "팩트만 딱",
    tag: "T",
    descriptions: ["돌려 말하지 않습니다. 좋고 나쁜 걸 그대로 말씀드려요."],
  },
  {
    style: "heart",
    label: "마음도 같이",
    tag: "F",
    descriptions: [
      "천천히, 궁금한 것 하나씩 같이 봐드립니다.",
      "문자로 남겨주셔도 편하게 답드려요.",
    ],
  },
];

type PhoneResult =
  | { status: "loading" }
  | { status: "ready"; phone: string }
  | { status: "error" };

function toDigits(phone: string): string {
  return phone.replace(/[^0-9+]/g, "");
}

export default function ConsultStylePicker() {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<ConsultStyle | null>(null);
  // 선택지별로 결과를 따로 들고 있어서, 빠르게 번갈아 눌러 응답 순서가
  // 뒤바뀌어도 화면에는 항상 "지금 고른 쪽"의 결과만 보입니다.
  const [results, setResults] = useState<Partial<Record<ConsultStyle, PhoneResult>>>({});

  async function fetchPhone(style: ConsultStyle) {
    setResults((prev) => ({ ...prev, [style]: { status: "loading" } }));
    try {
      const response = await fetch("/api/consult-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style }),
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok || typeof data.phone !== "string") {
        throw new Error("phone unavailable");
      }
      setResults((prev) => ({ ...prev, [style]: { status: "ready", phone: data.phone } }));
    } catch {
      setResults((prev) => ({ ...prev, [style]: { status: "error" } }));
    }
  }

  function handleSelect(style: ConsultStyle) {
    setSelected(style);
    const current = results[style];
    if (!current || current.status === "error") {
      fetchPhone(style);
    }
  }

  const result = selected ? results[selected] : undefined;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="mt-6 inline-flex items-center justify-center rounded-full border border-gold-400/50 px-5 py-2 text-sm font-bold text-gold-400 transition-colors hover:border-gold-400 hover:bg-gold-400/10"
      >
        나랑 맞는 상담 스타일 고르기 →
      </button>

      {isOpen && (
        <ActionModal title="상담도 취향이 있으니까" onClose={() => setIsOpen(false)}>
          <p className="mt-1 text-sm text-navy-800/60">편하신 쪽으로 골라주세요.</p>

          <div className="mt-4 flex flex-col gap-2">
            {OPTIONS.map((option) => {
              const isSelected = selected === option.style;
              return (
                <button
                  key={option.style}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handleSelect(option.style)}
                  className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                    isSelected
                      ? "border-gold-500 bg-gold-500/10"
                      : "border-navy-900/15 hover:border-gold-500"
                  }`}
                >
                  <span className="text-sm font-bold text-navy-950">
                    {option.label}
                    <span className="font-medium text-navy-800/40"> · {option.tag}</span>
                  </span>
                  {option.descriptions.map((line) => (
                    <span
                      key={line}
                      className="mt-1 block text-xs leading-relaxed text-navy-800/70"
                    >
                      {line}
                    </span>
                  ))}
                </button>
              );
            })}
          </div>

          {result?.status === "loading" && (
            <p className="mt-5 text-center text-sm text-navy-800/50">번호 불러오는 중...</p>
          )}

          {result?.status === "error" && selected && (
            <div className="mt-5 text-center">
              <p className="text-sm text-red-600">번호를 불러오지 못했어요.</p>
              <div className="mt-3 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => fetchPhone(selected)}
                  className="rounded-md border border-navy-900/15 px-4 py-2.5 text-sm font-bold text-navy-800 transition-colors hover:border-gold-500 hover:text-gold-600"
                >
                  다시 시도
                </button>
                <a
                  href={PHONE_HREF}
                  className="text-xs text-navy-800/60 underline-offset-2 hover:text-gold-600 hover:underline"
                >
                  대표전화 {PHONE_NUMBER}로 연락하기
                </a>
              </div>
            </div>
          )}

          {result?.status === "ready" && (
            <PhoneActions phone={result.phone} />
          )}
        </ActionModal>
      )}
    </>
  );
}

function PhoneActions({ phone }: { phone: string }) {
  const [copied, setCopied] = useState(false);
  // 모달은 클릭 후에만 그려지므로(서버 렌더링 없음) 여기서 바로 기기를 판별해도
  // 하이드레이션 불일치가 생기지 않습니다.
  const isMobile = isMobileDevice();
  const digits = toDigits(phone);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 권한이 없는 환경 등은 조용히 무시합니다.
    }
  }

  return (
    <div className="mt-5">
      <p className="text-center text-lg font-black text-gold-600">{phone}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <a
          href={`tel:${digits}`}
          className="rounded-md bg-gradient-to-r from-gold-400 to-gold-600 px-4 py-2.5 text-center text-sm font-bold text-navy-950 transition-transform hover:scale-[1.02]"
        >
          전화하기
        </a>
        <a
          href={`sms:${digits}`}
          className="rounded-md border border-navy-900/15 px-4 py-2.5 text-center text-sm font-bold text-navy-800 transition-colors hover:border-gold-500 hover:text-gold-600"
        >
          문자 남기기
        </a>
      </div>
      {!isMobile && (
        <button
          type="button"
          onClick={handleCopy}
          className="mt-2 w-full text-center text-xs text-navy-800/60 hover:text-gold-600"
        >
          {copied ? "복사되었습니다" : "번호 복사"}
        </button>
      )}
    </div>
  );
}
