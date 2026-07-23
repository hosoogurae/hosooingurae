"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Listing } from "../data/listings";
import type { ListingSubmission } from "../data/listingSubmissions";
import type { ComplexOption } from "../lib/naverImport";
import { parseKoreanAmountToManwon } from "../lib/naverTextParser";
import {
  ListingFormFields,
  type ComplexMode,
  type NewComplexState,
} from "./ListingFields";

function normalizeComplexName(name: string): string {
  return name.replace(/\s+/g, "").toLowerCase();
}

/** 접수 건의 자유 입력 단지명을 기존 단지 목록과 매칭합니다(네이버 가져오기와 동일한 방식). */
function matchComplexId(
  complexName: string,
  options: ComplexOption[],
): string | undefined {
  const target = normalizeComplexName(complexName);
  if (!target) return undefined;

  const matched = options.find((option) => {
    const name = normalizeComplexName(option.name);
    return name === target || name.includes(target) || target.includes(name);
  });

  return matched?.id;
}

const EMPTY_DRAFT: Listing = {
  id: "",
  complexId: "",
  propertyType: "아파트",
  status: "published",
  transactionType: "매매",
  price: 0,
  priceLabel: "",
  building: "",
  floor: 0,
  totalFloors: 0,
  supplyArea: 0,
  exclusiveArea: 0,
  roomCount: 0,
  bathroomCount: 0,
  direction: "",
  moveInDate: "",
  maintenanceFee: "",
  shortDescription: "",
  features: [],
  isFeatured: false,
};

export default function AdminRegisterPage() {
  const [complexOptions, setComplexOptions] = useState<ComplexOption[]>([]);
  const [draft, setDraft] = useState<Listing>(EMPTY_DRAFT);
  const [featuresInput, setFeaturesInput] = useState("");
  const [complexMode, setComplexMode] = useState<ComplexMode>("existing");
  const [newComplex, setNewComplex] = useState<NewComplexState>({
    name: "",
    address: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitErrors, setSubmitErrors] = useState<string[] | null>(null);
  const [registered, setRegistered] = useState<Listing | null>(null);
  const [sourceSubmission, setSourceSubmission] =
    useState<ListingSubmission | null>(null);

  function applyPrefillFromSubmission(
    submission: ListingSubmission,
    options: ComplexOption[],
  ) {
    const matchedId = matchComplexId(submission.complexName, options);
    if (matchedId) {
      setComplexMode("existing");
    } else {
      setComplexMode("new");
      setNewComplex({ name: submission.complexName, address: "" });
    }

    const featureTags = [
      submission.occupancyStatus,
      submission.interiorCondition,
      submission.viewingAvailability
        ? `집보기: ${submission.viewingAvailability}`
        : undefined,
    ].filter((value): value is string => Boolean(value));
    setFeaturesInput(featureTags.join(", "));

    setDraft((prev) => ({
      ...prev,
      complexId: matchedId ?? "",
      transactionType: submission.transactionType,
      price: parseKoreanAmountToManwon(submission.desiredPriceLabel) ?? 0,
      priceLabel: submission.desiredPriceLabel,
      building: submission.building ?? "",
      floor: submission.floor ?? 0,
      moveInDate: submission.moveOutDate ?? "",
      shortDescription: submission.notes ?? "",
    }));
  }

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const submissionId = new URLSearchParams(window.location.search).get(
        "submissionId",
      );

      let options: ComplexOption[] = [];
      try {
        const response = await fetch("/api/complexes");
        const data = await response.json();
        if (response.ok) {
          options = data.complexOptions as ComplexOption[];
        }
      } catch {
        // 목록을 못 가져와도 "새 단지 추가"로 계속 진행할 수 있습니다.
      }
      if (cancelled) return;
      setComplexOptions(options);

      if (submissionId) {
        try {
          const response = await fetch(
            `/api/admin/listing-submissions/${submissionId}`,
          );
          const data = await response.json();
          if (!cancelled && response.ok) {
            const submission = data.submission as ListingSubmission;
            setSourceSubmission(submission);
            applyPrefillFromSubmission(submission, options);
            return;
          }
        } catch {
          // 접수 정보를 못 가져와도 빈 등록 폼으로 계속 진행할 수 있습니다.
        }
      }

      if (options.length > 0) {
        setDraft((prev) => ({ ...prev, complexId: options[0].id }));
      } else {
        setComplexMode("new");
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateDraft<K extends keyof Listing>(key: K, value: Listing[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setDraft(EMPTY_DRAFT);
    setFeaturesInput("");
    setComplexMode(complexOptions.length > 0 ? "existing" : "new");
    setNewComplex({ name: "", address: "" });
    setSubmitErrors(null);
    setRegistered(null);
    setSourceSubmission(null);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitErrors(null);

    try {
      const payload: Record<string, unknown> = {
        ...draft,
        id: undefined, // 매물 ID는 서버가 자동으로 만들어줍니다.
        features: featuresInput
          .split(",")
          .map((feature) => feature.trim())
          .filter(Boolean),
      };

      // 접수 건에서 넘어온 경우, 접수 때 올린 사진을 그대로 매물 사진으로 승계합니다.
      if (sourceSubmission && sourceSubmission.photos.length > 0) {
        payload.images = sourceSubmission.photos;
      }

      if (complexMode === "new") {
        delete payload.complexId;
        payload.newComplex = newComplex;
      }

      const response = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        setSubmitErrors(data.errors ?? [data.error ?? "등록에 실패했습니다."]);
        return;
      }

      const createdListing = data.listing as Listing;
      setRegistered(createdListing);

      // 매물 저장이 실제로 성공했을 때만 접수 건을 "등록됨"으로 표시합니다.
      // 이 요청이 실패해도 매물 자체는 이미 저장됐으니 등록을 되돌리지 않습니다.
      if (sourceSubmission) {
        try {
          const patchResponse = await fetch(
            `/api/admin/listing-submissions/${sourceSubmission.id}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                status: "converted",
                convertedListingId: createdListing.id,
              }),
            },
          );
          if (!patchResponse.ok) {
            console.error("[admin] 접수 상태 업데이트 실패", await patchResponse.json());
          }
        } catch (patchError) {
          console.error("[admin] 접수 상태 업데이트 실패", patchError);
        }
      }
    } catch {
      setSubmitErrors(["네트워크 오류로 등록에 실패했습니다. 다시 시도해주세요."]);
    } finally {
      setSubmitting(false);
    }
  }

  if (registered) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-xl border border-navy-900/10 p-6 text-center sm:p-8">
          <p className="text-sm font-semibold text-gold-600">등록 완료</p>
          <h1 className="mt-2 text-xl font-black text-navy-950 sm:text-2xl">
            매물이 저장되었습니다.
          </h1>
          <p className="mt-2 text-sm text-navy-800/60">
            {registered.status === "published"
              ? "지금 바로 홈페이지에서 확인할 수 있어요."
              : "임시저장 상태예요. 매물 관리 화면에서 공개로 바꿀 수 있어요."}
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            {registered.status === "published" && (
              <Link
                href={`/listings/${registered.id}`}
                target="_blank"
                className="rounded-md bg-gradient-to-r from-gold-500 to-gold-600 px-6 py-2.5 text-sm font-bold text-navy-950 shadow-md shadow-gold-500/30"
              >
                등록된 매물 보기
              </Link>
            )}
            <button
              type="button"
              onClick={resetForm}
              className="rounded-md border border-navy-900/15 px-6 py-2.5 text-sm font-bold text-navy-800 transition-colors hover:border-gold-500 hover:text-gold-600"
            >
              매물 하나 더 등록하기
            </button>
            <Link
              href="/admin/listings"
              className="rounded-md border border-navy-900/15 px-6 py-2.5 text-sm font-bold text-navy-800 transition-colors hover:border-gold-500 hover:text-gold-600"
            >
              전체 매물 관리
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold tracking-wide text-gold-600">
          ADMIN
        </p>
        <Link
          href="/admin/listings"
          className="text-sm font-medium text-navy-800/60 underline-offset-4 hover:text-gold-600 hover:underline"
        >
          등록된 매물 관리 →
        </Link>
      </div>
      <h1 className="mt-2 text-2xl font-black text-navy-950 sm:text-3xl">
        매물 등록
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-navy-800/70">
        아래 항목을 채우고 맨 아래 &quot;등록하기&quot; 버튼을 누르면 바로
        저장돼요. 사진 올리기는 아직 준비 중이라, 텍스트 정보만 먼저
        등록해주세요.
      </p>

      {sourceSubmission && (
        <div className="mt-4 rounded-md border border-gold-500/30 bg-gold-500/10 px-3 py-2 text-sm text-navy-900">
          <strong>{sourceSubmission.contactName}</strong>님이 접수한 매물
          정보로 미리 채워졌습니다({sourceSubmission.contactPhone}). 공급면적
          · 전용면적 · 방/욕실 수는 접수 내용에 없어 직접 입력해주세요.
        </div>
      )}

      <div className="mt-8 rounded-xl border border-navy-900/10 p-6 sm:p-8">
        <ListingFormFields
          draft={draft}
          complexOptions={complexOptions}
          featuresInput={featuresInput}
          onChangeField={updateDraft}
          onChangeFeaturesInput={setFeaturesInput}
          showId={false}
          allowNewComplex
          complexMode={complexMode}
          onChangeComplexMode={setComplexMode}
          newComplex={newComplex}
          onChangeNewComplex={setNewComplex}
        />

        {submitErrors && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            <ul className="list-disc space-y-0.5 pl-4">
              {submitErrors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full rounded-md bg-gradient-to-r from-gold-500 to-gold-600 px-6 py-3 text-sm font-bold text-navy-950 shadow-md shadow-gold-500/30 transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {submitting ? "등록 중..." : "등록하기"}
          </button>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-navy-800/40">
        <Link href="/admin/import-naver" className="underline-offset-4 hover:underline">
          네이버 매물 가져오기 (테스트 기능) →
        </Link>
        {" · "}
        <Link href="/admin/floor-plans" className="underline-offset-4 hover:underline">
          단지 평면도 관리 →
        </Link>
        {" · "}
        <Link
          href="/admin/listing-submissions"
          className="underline-offset-4 hover:underline"
        >
          매물 접수 확인 →
        </Link>
      </p>
    </div>
  );
}
