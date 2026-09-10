"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ContactRequestStatus } from "../../../data/contactRequests";
import ContactPickerButton from "../../ContactPickerButton";
import { buildSmsHref } from "../../../lib/listingInquiry";
import { normalizePhone } from "../../../lib/phoneNormalize";
import type { AdminSmsTemplate } from "../../../lib/smsTemplates";
import {
  DEFAULT_SMS_TEMPLATES,
  findUnresolvedSmsTokens,
  resolveSmsTemplate,
} from "../../../lib/smsTemplateText";
import { formatContractDateKorean, formatContractTimeKorean } from "../../../lib/contractPrepSms";
import type { ListingWithComplex } from "../../../lib/listings";

const CUSTOM_ENTRY_ID = "custom";

function AdminSmsComposeInner() {
  const searchParams = useSearchParams();
  const initialPhone = searchParams.get("phone") ?? "";
  const contactRequestId = searchParams.get("contactRequestId");
  const contactStatus = searchParams.get("contactStatus") as ContactRequestStatus | null;
  const listingId = searchParams.get("listingId");

  const [phone, setPhone] = useState(initialPhone);
  const [recipientName, setRecipientName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [body, setBody] = useState("");
  const [visitDateStr, setVisitDateStr] = useState("");
  const [visitTimeStr, setVisitTimeStr] = useState("");
  const [myTemplates, setMyTemplates] = useState<AdminSmsTemplate[]>([]);
  const [myTemplatesError, setMyTemplatesError] = useState<string | null>(null);
  const [listing, setListing] = useState<ListingWithComplex | null>(null);

  const [smsOpened, setSmsOpened] = useState(false);
  const [statusPrompt, setStatusPrompt] = useState<"hidden" | "asking" | "saving" | "done">(
    "hidden",
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/sms-templates")
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        if (!cancelled) setMyTemplates(data.templates as AdminSmsTemplate[]);
      })
      .catch(() => {
        if (!cancelled) setMyTemplatesError("내 양식을 불러오지 못했습니다.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!listingId) return;
    let cancelled = false;
    fetch(`/api/admin/listings/${listingId}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        if (!cancelled) setListing(data.listing as ListingWithComplex);
      })
      .catch(() => {
        // 매물 정보는 있으면 좋은 보조 정보라 실패해도 조용히 무시합니다
        // (문자 작성 자체는 매물 정보 없이도 계속 가능해야 합니다).
      });
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  // 문의함에서 넘어온 경우에만, 문자 앱을 열고 이 화면으로 돌아왔을 때
  // 상태 변경 여부를 물어봅니다. 이미 연락함/완료 상태면 다시 묻지 않습니다.
  const shouldOfferStatusChange =
    Boolean(contactRequestId) && contactStatus !== "contacted" && contactStatus !== "closed";

  useEffect(() => {
    if (!shouldOfferStatusChange) return;
    function onVisibilityChange() {
      if (document.visibilityState === "visible" && smsOpened) {
        setStatusPrompt((prev) => (prev === "hidden" ? "asking" : prev));
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [shouldOfferStatusChange, smsOpened]);

  const variables = useMemo(
    () => ({
      complexName: listing?.complex.name,
      address: listing?.complex.address,
      // 손님에게 문자로 나가는 링크라 지금 관리자가 접속한 도메인이 아니라
      // NEXT_PUBLIC_SITE_URL을 씁니다(예전엔 window.location.origin을 써서,
      // 관리자가 vercel.app 미리보기로 접속해 있으면 그 주소가 그대로
      // 손님에게 전달되는 문제가 있었습니다).
      listingPageUrl:
        listingId && process.env.NEXT_PUBLIC_SITE_URL
          ? `${process.env.NEXT_PUBLIC_SITE_URL}/listings/${listingId}`
          : undefined,
      recipientName: recipientName.trim() || undefined,
      dateLabel: visitDateStr ? formatContractDateKorean(visitDateStr) : undefined,
      timeLabel: visitTimeStr ? formatContractTimeKorean(visitTimeStr) : undefined,
    }),
    [listing, listingId, recipientName, visitDateStr, visitTimeStr],
  );

  const templateOptions = useMemo(
    () => [
      ...DEFAULT_SMS_TEMPLATES.map((template) => ({ value: template.id, label: template.label })),
      ...myTemplates.map((template) => ({ value: `my:${template.id}`, label: template.name })),
      { value: CUSTOM_ENTRY_ID, label: "직접 입력" },
    ],
    [myTemplates],
  );

  const unresolvedTokens = useMemo(() => findUnresolvedSmsTokens(body), [body]);

  function handleSelectTemplate(id: string) {
    setTemplateId(id);
    if (id === CUSTOM_ENTRY_ID) {
      setBody("");
      return;
    }
    if (id.startsWith("my:")) {
      const myTemplate = myTemplates.find((item) => `my:${item.id}` === id);
      if (myTemplate) setBody(resolveSmsTemplate(myTemplate.body, variables));
      return;
    }
    const template = DEFAULT_SMS_TEMPLATES.find((item) => item.id === id);
    if (template) setBody(resolveSmsTemplate(template.body, variables));
  }

  async function handlePasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setPhone(text.trim());
    } catch {
      // 클립보드 권한이 없으면 조용히 무시 — 직접 입력하면 됩니다.
    }
  }

  /** 연락처에서 가져온 번호는 이미 010-1234-5678 형태로 정규화되어 옵니다. */
  function handleContactPicked(contact: { name: string | undefined; phone: string }) {
    setPhone(contact.phone);
    if (contact.name) {
      setRecipientName(contact.name);
      // 이미 템플릿을 골라 본문에 {이름} 자리가 그대로 남아있을 수 있으니,
      // 지금 본문에서도 바로 채웁니다(다음 템플릿 선택부터는 variables가
      // 자동으로 채워줌).
      setBody((prev) => (prev.includes("{이름}") ? prev.split("{이름}").join(contact.name!) : prev));
    }
  }

  /** 날짜를 고르면 "9월 11일(금)"으로 포맷해 이미 작성된 본문의 {날짜} 자리를 채웁니다. */
  function handleVisitDateChange(value: string) {
    setVisitDateStr(value);
    if (!value) return;
    const label = formatContractDateKorean(value);
    setBody((prev) => (prev.includes("{날짜}") ? prev.split("{날짜}").join(label) : prev));
  }

  /** 시간을 고르면 "오후 3시"로 포맷해 이미 작성된 본문의 {시간} 자리를 채웁니다. */
  function handleVisitTimeChange(value: string) {
    setVisitTimeStr(value);
    if (!value) return;
    const label = formatContractTimeKorean(value);
    setBody((prev) => (prev.includes("{시간}") ? prev.split("{시간}").join(label) : prev));
  }

  const smsHref = phone.trim() ? buildSmsHref(normalizePhone(phone), body) : null;

  async function handleStatusChange(shouldChange: boolean) {
    if (!shouldChange || !contactRequestId) {
      setStatusPrompt("done");
      return;
    }
    setStatusPrompt("saving");
    try {
      const response = await fetch(`/api/admin/contact-requests/${contactRequestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "contacted" }),
      });
      if (!response.ok) throw new Error();
    } catch {
      alert("상태 변경에 실패했습니다. 문의함에서 직접 바꿔주세요.");
    } finally {
      setStatusPrompt("done");
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 sm:py-16">
      <p className="text-sm font-semibold tracking-wide text-gold-600">ADMIN</p>
      <h1 className="mt-2 text-2xl font-black text-navy-950 sm:text-3xl">문자 작성</h1>
      <p className="mt-3 text-sm leading-relaxed text-navy-800/70">
        버튼을 누르면 문자 앱이 열립니다. 실제 전송은 문자 앱에서 직접 눌러야
        합니다.
      </p>

      {statusPrompt === "asking" && (
        <div className="mt-5 rounded-xl border border-gold-500 bg-gold-500/10 px-4 py-4">
          <p className="text-sm font-bold text-navy-950">
            문자 보내셨나요? 상태를 연락함으로 바꿀까요?
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => handleStatusChange(true)}
              className="min-h-[48px] flex-1 rounded-lg bg-navy-950 text-sm font-bold text-white"
            >
              예, 연락함으로 변경
            </button>
            <button
              type="button"
              onClick={() => handleStatusChange(false)}
              className="min-h-[48px] flex-1 rounded-lg border border-navy-900/15 text-sm font-bold text-navy-800"
            >
              아니요
            </button>
          </div>
        </div>
      )}
      {statusPrompt === "saving" && (
        <p className="mt-5 text-sm text-navy-800/50">상태 변경 중...</p>
      )}
      {statusPrompt === "done" && (
        <div className="mt-5 flex items-center justify-between rounded-xl border border-navy-900/10 bg-white px-4 py-3">
          <span className="text-sm text-navy-800/60">처리됐습니다.</span>
          <Link
            href="/admin/contacts"
            className="text-sm font-bold text-gold-600 underline-offset-2 hover:underline"
          >
            문의함으로 돌아가기
          </Link>
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-bold text-navy-900">받는 사람</h2>
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="010-0000-0000"
          inputMode="tel"
          className="mt-2 min-h-[52px] w-full rounded-lg border border-navy-900/15 px-3 text-base text-navy-900 outline-none focus:border-gold-500"
        />
        <button
          type="button"
          onClick={handlePasteFromClipboard}
          className="mt-2 min-h-[48px] w-full rounded-lg border border-navy-900/15 text-sm font-bold text-navy-800"
        >
          붙여넣기
        </button>
        <ContactPickerButton onPick={handleContactPicked} className="mt-2" />
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold text-navy-900">문자 템플릿</h2>
        <select
          value={templateId}
          onChange={(event) => handleSelectTemplate(event.target.value)}
          className="mt-2 min-h-[52px] w-full rounded-lg border border-navy-900/15 px-3 text-base text-navy-900 outline-none focus:border-gold-500"
        >
          <option value="" disabled>
            템플릿을 선택해주세요
          </option>
          {templateOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {myTemplatesError && (
          <p className="mt-2 text-xs text-red-600">{myTemplatesError}</p>
        )}
        <Link
          href="/admin/sms/templates"
          className="mt-2 block text-right text-sm font-bold text-gold-600 underline-offset-2 hover:underline"
        >
          내 양식 관리 →
        </Link>
        <Link
          href="/admin/sms/contract-prep"
          className="mt-1 block text-right text-sm font-bold text-gold-600 underline-offset-2 hover:underline"
        >
          계약 준비물 문자 만들기 →
        </Link>
      </section>

      <section className="mt-6 grid grid-cols-2 gap-3">
        <label className="block text-sm font-bold text-navy-900">
          방문 날짜
          <input
            type="date"
            value={visitDateStr}
            onChange={(event) => handleVisitDateChange(event.target.value)}
            className="mt-1.5 min-h-[52px] w-full rounded-lg border border-navy-900/15 px-3 text-base text-navy-900 outline-none focus:border-gold-500"
          />
        </label>
        <label className="block text-sm font-bold text-navy-900">
          방문 시간
          <input
            type="time"
            value={visitTimeStr}
            onChange={(event) => handleVisitTimeChange(event.target.value)}
            className="mt-1.5 min-h-[52px] w-full rounded-lg border border-navy-900/15 px-3 text-base text-navy-900 outline-none focus:border-gold-500"
          />
        </label>
        <p className="col-span-2 text-xs text-navy-800/50">
          &quot;방문 일정 확인&quot; 같이 날짜·시간이 들어가는 양식을 쓸 때만 채워주세요.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold text-navy-900">내용</h2>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="문자 내용을 입력해주세요"
          rows={10}
          className="mt-2 w-full rounded-lg border border-navy-900/15 px-3 py-2.5 text-base leading-relaxed text-navy-900 outline-none focus:border-gold-500"
        />
        {unresolvedTokens.length > 0 && (
          <p className="mt-2 rounded-lg border border-gold-500 bg-gold-500/10 px-3 py-2 text-sm text-navy-900">
            아직 채워지지 않은 항목이 있습니다: {unresolvedTokens.join(", ")} — 직접
            입력해주세요.
          </p>
        )}
      </section>

      {smsHref ? (
        <a
          href={smsHref}
          onClick={() => setSmsOpened(true)}
          className="mt-8 flex min-h-[56px] w-full items-center justify-center rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-lg font-bold text-navy-950 shadow-md shadow-gold-500/30"
        >
          문자 보내기
        </a>
      ) : (
        <button
          type="button"
          disabled
          className="mt-8 min-h-[56px] w-full cursor-not-allowed rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-lg font-bold text-navy-950 opacity-50 shadow-md shadow-gold-500/30"
        >
          문자 보내기
        </button>
      )}
    </div>
  );
}

export default function AdminSmsComposePage() {
  return (
    <Suspense fallback={null}>
      <AdminSmsComposeInner />
    </Suspense>
  );
}
