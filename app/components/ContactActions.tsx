"use client";

import { useEffect, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { MessageCircle, MessageSquareText, PhoneIncoming, X } from "lucide-react";
import { PHONE_HREF, PHONE_NUMBER } from "../data/contact";
import { buildInquiryMessage, buildSmsHref, isMobileDevice } from "../lib/listingInquiry";
import { PhoneIcon } from "./icons";

// NEXT_PUBLIC_ 환경변수는 빌드 시 그대로 인라인되므로 클라이언트 컴포넌트에서
// 모듈 최상단에 직접 읽어도 됩니다(app/listings/[id]/page.tsx의
// NEXT_PUBLIC_INQUIRY_MOBILE과 동일한 패턴). 값이 없으면 해당 버튼을 통째로
// 숨깁니다.
const KAKAO_CHANNEL_URL = process.env.NEXT_PUBLIC_KAKAO_CHANNEL_URL?.trim() || undefined;
const INQUIRY_MOBILE_NUMBER = process.env.NEXT_PUBLIC_INQUIRY_MOBILE?.trim() || undefined;

// 구독할 대상이 없는 정적 값이라 아무 것도 하지 않는 구독 함수를 씁니다.
// 서버에서는 기기를 알 수 없으니 null을 반환해 하이드레이션 불일치를 피하고,
// 마운트된 클라이언트에서만 실제 값을 읽습니다(InquirySmsButton과 동일한 패턴).
function subscribe() {
  return () => {};
}
function getServerSnapshot() {
  return null;
}

function ActionModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
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
      aria-label={title}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-bold text-navy-950">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-navy-800/50 transition-colors hover:bg-navy-900/5 hover:text-navy-950"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
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

function SmsModalBody({ message }: { message: string }) {
  return (
    <div className="mt-4">
      <p className="text-lg font-black text-gold-600">{PHONE_NUMBER}</p>
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
          value={PHONE_NUMBER}
          label="휴대폰 번호 복사"
          className="rounded-md border border-navy-900/15 px-4 py-2.5 text-sm font-bold text-navy-800 transition-colors hover:border-gold-500 hover:text-gold-600"
        />
        <a
          href={PHONE_HREF}
          className="rounded-md border border-navy-900/15 px-4 py-2.5 text-center text-sm font-bold text-navy-800 transition-colors hover:border-gold-500 hover:text-gold-600"
        >
          전화하기 {PHONE_NUMBER}
        </a>
      </div>
    </div>
  );
}

function CallModalBody() {
  return (
    <div className="mt-4">
      <p className="text-2xl font-black text-gold-600">{PHONE_NUMBER}</p>
      <div className="mt-4 flex flex-col gap-2">
        <CopyButton
          value={PHONE_NUMBER}
          label="번호 복사"
          className="rounded-md bg-gradient-to-r from-gold-400 to-gold-600 px-4 py-2.5 text-sm font-bold text-navy-950 transition-transform hover:scale-[1.02]"
        />
        <a
          href={PHONE_HREF}
          className="rounded-md border border-navy-900/15 px-4 py-2.5 text-center text-sm font-bold text-navy-800 transition-colors hover:border-gold-500 hover:text-gold-600"
        >
          전화 걸기
        </a>
      </div>
    </div>
  );
}

function ContactRequestForm({
  listingId,
  onSuccess,
}: {
  listingId: string;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!consent || submitting) return;

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/contact-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, name, phone, preferredTime, consent }),
      });
      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.errors?.[0] ?? "제출에 실패했습니다.");
        setSubmitting(false);
        return;
      }
      onSuccess();
    } catch {
      setErrorMessage("네트워크 오류로 제출에 실패했습니다.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
      <p className="text-xs leading-relaxed text-navy-800/50">
        이름·연락처·희망 상담시간대는 상담 및 매물 안내 목적으로만 수집하며,
        상담 완료 후 일정 기간 보관 뒤 파기합니다.{" "}
        <Link
          href="/privacy"
          target="_blank"
          className="underline hover:text-navy-800"
        >
          개인정보처리방침 보기
        </Link>
      </p>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-navy-800">이름</span>
        <input
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="rounded-md border border-navy-900/15 px-3 py-2 text-sm outline-none focus:border-gold-500"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-navy-800">연락처</span>
        <input
          required
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="010-0000-0000"
          className="rounded-md border border-navy-900/15 px-3 py-2 text-sm outline-none focus:border-gold-500"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-navy-800">희망 상담시간대 (선택)</span>
        <input
          value={preferredTime}
          onChange={(event) => setPreferredTime(event.target.value)}
          placeholder="예: 평일 오후 2~4시"
          className="rounded-md border border-navy-900/15 px-3 py-2 text-sm outline-none focus:border-gold-500"
        />
      </label>

      <label className="flex items-start gap-2 text-xs text-navy-800/70">
        <input
          type="checkbox"
          required
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-0.5"
        />
        <span>개인정보 수집·이용에 동의합니다. (필수)</span>
      </label>

      {errorMessage && <p className="text-xs text-red-600">{errorMessage}</p>}

      <button
        type="submit"
        disabled={!consent || submitting}
        className="rounded-md bg-gradient-to-r from-gold-400 to-gold-600 px-4 py-2.5 text-sm font-bold text-navy-950 transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "제출 중..." : "제출하기"}
      </button>
    </form>
  );
}

function ContactRequestModalBody({ listingId }: { listingId: string }) {
  const [success, setSuccess] = useState(false);

  if (success) {
    return (
      <p className="mt-4 text-sm leading-relaxed text-navy-800/80">
        접수됐습니다. 빠른 시간 안에 연락드리겠습니다.
      </p>
    );
  }

  return <ContactRequestForm listingId={listingId} onSuccess={() => setSuccess(true)} />;
}

interface ContactActionsProps {
  /** 문의 문구에 매물번호를 담을 필요는 없지만("고객 화면엔 내부 id를 노출하지
   *  않는다" — listingInquiry.ts 주석), "연락받기" 폼 제출값에는 어떤 매물인지
   *  구조화된 값으로 남겨야 관리자가 정확히 특정할 수 있습니다. */
  listingId: string;
  complexName: string;
  building: string | undefined;
  floor: number;
  transactionType: string;
  priceLabel: string;
  /** 현재 상세페이지의 절대 URL. buildInquiryMessage에 그대로 전달되어 문의
   *  문구에 "어떤 매물인지" 확인 가능한 링크로 포함됩니다. host 헤더를 못
   *  구한 드문 경우에만 undefined이며, 그때는 buildInquiryMessage가 링크
   *  줄을 생략합니다. */
  pageUrl: string | undefined;
  /** "inline"(기본) = 데스크톱/일반 배치용 버튼 행. "sticky" = 모바일 화면
   *  하단에 항상 떠 있는 바(≥sm에서는 자동으로 숨김). */
  variant?: "inline" | "sticky";
  className?: string;
}

export default function ContactActions({
  listingId,
  complexName,
  building,
  floor,
  transactionType,
  priceLabel,
  pageUrl,
  variant = "inline",
  className = "",
}: ContactActionsProps) {
  const isMobile = useSyncExternalStore(subscribe, isMobileDevice, getServerSnapshot);
  const [openModal, setOpenModal] = useState<"sms" | "call" | "contact" | null>(null);

  const message = buildInquiryMessage({
    complexName,
    building,
    floor,
    transactionType,
    priceLabel,
    pageUrl,
  });

  const isSticky = variant === "sticky";

  // 문자/카카오톡은 환경변수가 없으면 버튼 자체가 안 뜨므로, 고정
  // grid-cols-4를 쓰면 둘 다 없을 때 하단 바 오른쪽이 빈 채로 남습니다.
  // 실제로 보여줄 버튼 개수(전화·연락받기는 항상 표시)에 맞춰 열 수를
  // 정합니다.
  const visibleActionCount =
    2 + (INQUIRY_MOBILE_NUMBER ? 1 : 0) + (KAKAO_CHANNEL_URL ? 1 : 0);
  const stickyGridColsClass =
    visibleActionCount === 4
      ? "grid-cols-4"
      : visibleActionCount === 3
        ? "grid-cols-3"
        : "grid-cols-2";

  // "sticky"는 sm 미만(모바일)에서만, "inline"은 sm 이상에서만 보여서 두
  // 변형이 겹치지 않습니다 — 이 페이지에 항상 둘 다 함께 렌더링되는 걸
  // 전제로 합니다(모바일에서 버튼이 중복으로 뜨지 않게).
  const containerClass = isSticky
    ? `fixed inset-x-0 bottom-0 z-40 grid ${stickyGridColsClass} gap-1 border-t border-navy-900/10 bg-white px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_16px_rgba(11,26,51,0.08)] sm:hidden ${className}`
    : `hidden gap-3 sm:flex sm:flex-wrap ${className}`;

  const primaryClass = isSticky
    ? "flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[11px] font-bold text-gold-600 transition-colors hover:bg-gold-500/10"
    : "inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold-400 to-gold-600 px-6 py-3 text-sm font-bold text-navy-950 shadow-lg shadow-gold-500/30 transition-transform hover:scale-[1.03]";

  const secondaryClass = isSticky
    ? "flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[11px] font-bold text-navy-800 transition-colors hover:bg-navy-900/5"
    : "inline-flex items-center justify-center gap-2 rounded-full border border-navy-900/15 bg-white px-6 py-3 text-sm font-bold text-navy-800 transition-colors hover:border-gold-500 hover:text-gold-600";

  const iconClass = isSticky ? "h-5 w-5" : "h-4 w-4";

  // 기기 판별 전(SSR/최초 렌더)에는 문자/전화 버튼이 자리만 차지하는 상태로
  // 보여줘 하이드레이션 이후 레이아웃이 튀지 않게 합니다. 카카오톡·연락받기는
  // 기기와 무관해 그대로 보여줍니다.
  const deviceKnown = isMobile !== null;

  return (
    <>
      <div className={containerClass}>
        {INQUIRY_MOBILE_NUMBER &&
          (deviceKnown ? (
            isMobile ? (
              <a
                href={buildSmsHref(INQUIRY_MOBILE_NUMBER, message)}
                className={primaryClass}
              >
                <MessageSquareText className={iconClass} strokeWidth={2} />
                {isSticky ? "문자" : "문자로 문의"}
              </a>
            ) : (
              <button type="button" onClick={() => setOpenModal("sms")} className={primaryClass}>
                <MessageSquareText className={iconClass} strokeWidth={2} />
                {isSticky ? "문자" : "문자로 문의"}
              </button>
            )
          ) : (
            <span className={`${primaryClass} opacity-0`} aria-hidden="true">
              <MessageSquareText className={iconClass} strokeWidth={2} />
              {isSticky ? "문자" : "문자로 문의"}
            </span>
          ))}

        {KAKAO_CHANNEL_URL && (
          <KakaoAction
            message={message}
            className={secondaryClass}
            iconClass={iconClass}
            compactLabel={isSticky}
          />
        )}

        {deviceKnown ? (
          isMobile ? (
            <a href={PHONE_HREF} className={secondaryClass}>
              <PhoneIcon className={iconClass} />
              {isSticky ? "전화" : `전화 걸기 ${PHONE_NUMBER}`}
            </a>
          ) : (
            <button type="button" onClick={() => setOpenModal("call")} className={secondaryClass}>
              <PhoneIcon className={iconClass} />
              {isSticky ? "전화" : "전화 걸기"}
            </button>
          )
        ) : (
          <span className={`${secondaryClass} opacity-0`} aria-hidden="true">
            <PhoneIcon className={iconClass} />
            {isSticky ? "전화" : "전화 걸기"}
          </span>
        )}

        <button
          type="button"
          onClick={() => setOpenModal("contact")}
          className={secondaryClass}
        >
          <PhoneIncoming className={iconClass} strokeWidth={2} />
          연락받기
        </button>
      </div>

      {openModal === "sms" && (
        <ActionModal title="휴대폰에서 문자로 문의해주세요" onClose={() => setOpenModal(null)}>
          <SmsModalBody message={message} />
        </ActionModal>
      )}
      {openModal === "call" && (
        <ActionModal title="전화 문의" onClose={() => setOpenModal(null)}>
          <CallModalBody />
        </ActionModal>
      )}
      {openModal === "contact" && (
        <ActionModal title="연락받기" onClose={() => setOpenModal(null)}>
          <ContactRequestModalBody listingId={listingId} />
        </ActionModal>
      )}
    </>
  );
}

function KakaoAction({
  message,
  className,
  iconClass,
  compactLabel,
}: {
  message: string;
  className: string;
  iconClass: string;
  compactLabel: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 4000);
    } catch {
      // 클립보드 권한이 없으면 복사 없이 채널만 엽니다.
    }
    window.open(KAKAO_CHANNEL_URL, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="relative">
      <button type="button" onClick={handleClick} className={className}>
        <MessageCircle className={iconClass} strokeWidth={2} />
        {compactLabel ? "카톡" : "카카오톡 상담"}
      </button>
      {copied && (
        <p className="absolute inset-x-0 bottom-full z-10 mb-2 whitespace-nowrap rounded-md bg-navy-950 px-3 py-2 text-center text-xs font-medium text-white shadow-lg">
          문의 내용이 복사되었습니다. 채팅창에 붙여넣어주세요.
        </p>
      )}
    </div>
  );
}
