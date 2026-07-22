"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Listing } from "../data/listings";
import type { ComplexOption } from "../lib/naverImport";
import {
  ListingFormFields,
  type ComplexMode,
  type NewComplexState,
} from "./ListingFields";

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

  useEffect(() => {
    let cancelled = false;

    async function loadComplexOptions() {
      try {
        const response = await fetch("/api/complexes");
        const data = await response.json();
        if (!cancelled && response.ok) {
          const options = data.complexOptions as ComplexOption[];
          setComplexOptions(options);
          if (options.length > 0) {
            setDraft((prev) => ({ ...prev, complexId: options[0].id }));
          } else {
            setComplexMode("new");
          }
        }
      } catch {
        // 목록을 못 가져와도 "새 단지 추가"로 계속 진행할 수 있습니다.
      }
    }

    loadComplexOptions();

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

      setRegistered(data.listing as Listing);
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
      </p>
    </div>
  );
}
