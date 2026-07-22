"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { buildSmsHref, isMobileDevice } from "../lib/listingInquiry";

// 구독할 대상이 없는 정적 값이라(페이지 로드 중 기기가 바뀌지 않음) 아무 것도
// 하지 않는 구독 함수를 씁니다. 서버에서는 기기를 알 수 없으니 null을 반환해
// 하이드레이션 불일치를 피하고, 마운트된 클라이언트에서만 실제 값을 읽습니다.
function subscribe() {
  return () => {};
}
function getServerSnapshot() {
  return null;
}

function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 권한이 없는 환경 등은 조용히 무시합니다.
    }
  }

  return (
    <button type="button" onClick={handleCopy} className={className}>
      {copied ? "복사되었습니다" : label}
    </button>
  );
}

function InquiryModal({
  phoneNumber,
  officePhoneNumber,
  officePhoneHref,
  message,
  onClose,
}: {
  phoneNumber: string;
  officePhoneNumber: string;
  officePhoneHref: string;
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="문자 문의"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-bold text-navy-950">
            휴대폰에서 문자로 문의해주세요
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-navy-800/50 transition-colors hover:bg-navy-900/5 hover:text-navy-950"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <p className="mt-3 text-lg font-black text-gold-600">{phoneNumber}</p>

        <pre className="mt-4 whitespace-pre-line rounded-lg bg-navy-900/[0.03] p-3 text-xs leading-relaxed text-navy-800">
          {message}
        </pre>

        <div className="mt-5 flex flex-col gap-2">
          <CopyButton
            value={message}
            label="문의내용 복사"
            className="rounded-md bg-gradient-to-r from-gold-400 to-gold-600 px-4 py-2.5 text-sm font-bold text-navy-950 transition-transform hover:scale-[1.02]"
          />
          <CopyButton
            value={phoneNumber}
            label="휴대폰 번호 복사"
            className="rounded-md border border-navy-900/15 px-4 py-2.5 text-sm font-bold text-navy-800 transition-colors hover:border-gold-500 hover:text-gold-600"
          />
          <a
            href={officePhoneHref}
            className="rounded-md border border-navy-900/15 px-4 py-2.5 text-center text-sm font-bold text-navy-800 transition-colors hover:border-gold-500 hover:text-gold-600"
          >
            전화하기 {officePhoneNumber}
          </a>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function InquirySmsButton({
  phoneNumber,
  message,
  officePhoneNumber,
  officePhoneHref,
}: {
  phoneNumber: string;
  message: string;
  officePhoneNumber: string;
  officePhoneHref: string;
}) {
  const isMobile = useSyncExternalStore(
    subscribe,
    isMobileDevice,
    getServerSnapshot,
  );
  const [modalOpen, setModalOpen] = useState(false);

  const baseClass =
    "rounded-full bg-gradient-to-r from-gold-400 to-gold-600 px-6 py-3 text-center text-sm font-bold text-navy-950 shadow-lg shadow-gold-500/30 transition-transform hover:scale-[1.03]";

  if (isMobile === null) {
    // 기기 판별 전: 레이아웃이 튀지 않도록 자리만 동일하게 차지하는 비활성 버튼.
    return (
      <span className={`${baseClass} opacity-0`} aria-hidden="true">
        문의하기
      </span>
    );
  }

  if (isMobile) {
    return (
      <a href={buildSmsHref(phoneNumber, message)} className={baseClass}>
        문의하기
      </a>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setModalOpen(true)} className={baseClass}>
        문의하기
      </button>
      {modalOpen && (
        <InquiryModal
          phoneNumber={phoneNumber}
          officePhoneNumber={officePhoneNumber}
          officePhoneHref={officePhoneHref}
          message={message}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
