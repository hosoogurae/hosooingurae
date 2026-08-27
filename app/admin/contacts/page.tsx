"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ContactRequest, ContactRequestStatus } from "../../data/contactRequests";
import type { ListingWithComplex } from "../../lib/listings";
import { formatComplexAndBuilding } from "../../lib/listingInquiry";

const STATUS_META: Record<ContactRequestStatus, { label: string; className: string }> = {
  new: { label: "미확인", className: "bg-red-500/10 text-red-700" },
  contacted: { label: "연락함", className: "bg-navy-900/10 text-navy-800" },
  closed: { label: "완료", className: "bg-green-500/10 text-green-700" },
};

const STATUS_ORDER: ContactRequestStatus[] = ["new", "contacted", "closed"];

const FILTER_OPTIONS: { value: ContactRequestStatus | "all"; label: string }[] = [
  { value: "new", label: "미확인" },
  { value: "contacted", label: "연락함" },
  { value: "closed", label: "완료" },
  { value: "all", label: "전체" },
];

function toTelHref(phone: string): string {
  return `tel:${phone.replace(/[^0-9+]/g, "")}`;
}

function formatReceivedAt(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  if (date.toDateString() === now.toDateString()) {
    return `오늘 ${hh}:${mm}`;
  }
  return `${date.getMonth() + 1}.${date.getDate()} ${hh}:${mm}`;
}

export default function AdminContactsPage() {
  const [contactRequests, setContactRequests] = useState<ContactRequest[] | null>(
    null,
  );
  const [listingsById, setListingsById] = useState<Map<string, ListingWithComplex>>(
    new Map(),
  );
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ContactRequestStatus | "all">("new");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [contactsResponse, listingsResponse] = await Promise.all([
          fetch("/api/admin/contact-requests"),
          fetch("/api/admin/listings"),
        ]);
        const contactsData = await contactsResponse.json();
        if (!contactsResponse.ok) {
          throw new Error(contactsData.error ?? "문의 목록을 불러오지 못했습니다.");
        }
        if (cancelled) return;

        setContactRequests(contactsData.contactRequests as ContactRequest[]);

        if (listingsResponse.ok) {
          const listingsData = await listingsResponse.json();
          const listings = listingsData.listings as ListingWithComplex[];
          setListingsById(new Map(listings.map((listing) => [listing.id, listing])));
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
          );
          setContactRequests([]);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function updateStatus(id: string, status: ContactRequestStatus) {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/admin/contact-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();

      if (!response.ok) {
        alert(data.errors?.[0] ?? "상태 변경에 실패했습니다.");
        return;
      }

      setContactRequests(
        (prev) =>
          prev?.map((item) =>
            item.id === id ? (data.contactRequest as ContactRequest) : item,
          ) ?? null,
      );
    } catch {
      alert("네트워크 오류로 상태 변경에 실패했습니다.");
    } finally {
      setUpdatingId(null);
    }
  }

  const newCount = contactRequests?.filter((c) => c.status === "new").length ?? 0;

  const visibleRequests = useMemo(() => {
    if (!contactRequests) return [];
    if (filter === "all") return contactRequests;
    return contactRequests.filter((c) => c.status === filter);
  }, [contactRequests, filter]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 sm:py-16">
      <p className="text-sm font-semibold tracking-wide text-gold-600">ADMIN</p>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-black text-navy-950 sm:text-3xl">문의함</h1>
        {contactRequests !== null && (
          <span
            className={`rounded-full px-3 py-1 text-sm font-bold ${
              newCount > 0
                ? "bg-red-500/10 text-red-700"
                : "bg-navy-900/5 text-navy-800"
            }`}
          >
            미확인 {newCount}건
          </span>
        )}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-navy-800/70">
        매물 상세페이지 &quot;연락받기&quot; 폼으로 들어온 문의 목록입니다.
      </p>

      {error && (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
              filter === option.value
                ? "bg-navy-950 text-white"
                : "border border-navy-900/15 text-navy-800 hover:border-gold-500 hover:text-gold-600"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {contactRequests === null ? (
        <p className="mt-8 text-sm text-navy-800/50">불러오는 중...</p>
      ) : visibleRequests.length === 0 ? (
        <p className="mt-8 rounded-xl border border-navy-900/10 px-6 py-16 text-center text-sm text-navy-800/50">
          {filter === "all" ? "접수된 문의가 없습니다." : "해당 상태의 문의가 없습니다."}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-navy-900/10">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-navy-900/10 bg-navy-900/[0.02] text-left text-xs font-semibold text-navy-800/50">
                <th className="whitespace-nowrap px-4 py-3">접수시각</th>
                <th className="px-4 py-3">이름</th>
                <th className="whitespace-nowrap px-4 py-3">연락처</th>
                <th className="px-4 py-3">희망 시간대</th>
                <th className="px-4 py-3">문의한 매물</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {visibleRequests.map((request) => {
                const statusMeta = STATUS_META[request.status];
                const listing = listingsById.get(request.listingId);

                return (
                  <tr
                    key={request.id}
                    className="border-b border-navy-900/10 align-top last:border-0"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-navy-800/60">
                      {formatReceivedAt(request.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-navy-950">
                      {request.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <a
                        href={toTelHref(request.phone)}
                        className="font-medium text-navy-800 underline-offset-2 hover:text-gold-600 hover:underline"
                      >
                        {request.phone}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-navy-800/70">
                      {request.preferredTime ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      {listing ? (
                        listing.status === "published" ? (
                          <Link
                            href={`/listings/${listing.id}`}
                            target="_blank"
                            className="font-semibold text-navy-950 underline-offset-2 hover:text-gold-600 hover:underline"
                          >
                            {formatComplexAndBuilding(listing.complex.name, listing.building)}
                          </Link>
                        ) : (
                          <span className="font-semibold text-navy-950">
                            {formatComplexAndBuilding(listing.complex.name, listing.building)}{" "}
                            <span className="text-xs font-normal text-navy-800/40">
                              (비공개)
                            </span>
                          </span>
                        )
                      ) : (
                        <span className="text-navy-800/40">삭제된 매물</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${statusMeta.className}`}
                      >
                        {statusMeta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <Link
                          href={{
                            pathname: "/admin/sms-compose",
                            query: {
                              phone: request.phone,
                              contactRequestId: request.id,
                              contactStatus: request.status,
                              ...(listing ? { listingId: listing.id } : {}),
                            },
                          }}
                          className="rounded-full border border-gold-500 px-3 py-1 text-xs font-bold text-gold-600 transition-colors hover:bg-gold-500/10"
                        >
                          문자 보내기
                        </Link>
                        {STATUS_ORDER.map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => updateStatus(request.id, status)}
                            disabled={
                              updatingId === request.id || request.status === status
                            }
                            className={`rounded-full px-3 py-1 text-xs font-bold transition-colors disabled:cursor-not-allowed ${
                              request.status === status
                                ? `${STATUS_META[status].className} opacity-70`
                                : "border border-navy-900/15 text-navy-800/60 hover:border-gold-500 hover:text-gold-600"
                            }`}
                          >
                            {STATUS_META[status].label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
