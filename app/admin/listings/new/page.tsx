"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Listing } from "../../../data/listings";
import type { ListingSubmission } from "../../../data/listingSubmissions";
import { normalizeComplexName } from "../../../lib/complexNameNormalize";
import type { DuplicateMatch } from "../../../lib/naverDuplicate";
import type { ComplexOption } from "../../../lib/naverImport";
import { parseKoreanAmountToManwon } from "../../../lib/naverTextParser";
import {
  Field,
  ListingFormFields,
  inputClass,
  type ComplexMode,
  type NewComplexState,
} from "../../ListingFields";
import NaverDuplicatePanel from "../../NaverDuplicatePanel";

type NaverDuplicateChoice = "update" | "new" | null;

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
  dealStatus: "advertising",
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
  hasLoan: false,
  loanAmount: null,
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
  const [pendingPhotoFiles, setPendingPhotoFiles] = useState<File[]>([]);
  const [photoUploadWarnings, setPhotoUploadWarnings] = useState<string[] | null>(
    null,
  );

  const [naverUrl, setNaverUrl] = useState("");
  const [naverPastedText, setNaverPastedText] = useState("");
  const [naverAnalyzing, setNaverAnalyzing] = useState(false);
  const [naverError, setNaverError] = useState<string | null>(null);
  const [naverDuplicateMatch, setNaverDuplicateMatch] =
    useState<DuplicateMatch | null>(null);
  const [naverMergedPreview, setNaverMergedPreview] = useState<Listing | null>(
    null,
  );
  const [naverDuplicateChoice, setNaverDuplicateChoice] =
    useState<NaverDuplicateChoice>(null);
  const [naverUncertainFields, setNaverUncertainFields] = useState<
    string[] | null
  >(null);
  const [naverUnitTypeCandidates, setNaverUnitTypeCandidates] = useState<
    string[] | null
  >(null);

  /** /api/import-naver가 돌려준 draft는 이미 Listing 형태 그대로라 통째로 교체합니다. */
  function applyPrefillFromNaverDraft(
    naverDraft: Listing,
    options: ComplexOption[],
    unitTypeCandidates: string[],
    uncertainFields: string[],
    suggestedComplexName: string | undefined,
  ) {
    setComplexOptions(options);
    setDraft(naverDraft);
    setFeaturesInput(naverDraft.features.join(", "));

    // URL 입력칸에 직접 입력한 값이 없었는데 붙여넣은 텍스트 안의 naver.me
    // 링크가 자동으로 인식됐다면, 입력칸에도 그대로 보여줘 관리자가 확인할
    // 수 있게 합니다. 직접 입력한 값이 있었다면 이 분기 자체를 타지 않습니다.
    if (!naverUrl.trim() && naverDraft.naverUrl) {
      setNaverUrl(naverDraft.naverUrl);
    }

    if (naverDraft.complexId) {
      setComplexMode("existing");
    } else {
      setComplexMode("new");
      setNewComplex({ name: suggestedComplexName ?? "", address: "" });
    }

    setNaverUncertainFields(uncertainFields.length > 0 ? uncertainFields : null);
    setNaverUnitTypeCandidates(
      unitTypeCandidates.length > 1 ? unitTypeCandidates : null,
    );
  }

  async function handleAnalyzeNaver() {
    if (!naverPastedText.trim()) {
      setNaverError("네이버에서 복사한 매물 텍스트를 붙여넣어주세요.");
      return;
    }

    setNaverAnalyzing(true);
    setNaverError(null);
    setNaverDuplicateMatch(null);
    setNaverMergedPreview(null);
    setNaverDuplicateChoice(null);
    setNaverUncertainFields(null);
    setNaverUnitTypeCandidates(null);

    try {
      const response = await fetch("/api/import-naver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: naverUrl, pastedText: naverPastedText }),
      });
      const data = await response.json();

      if (!response.ok) {
        setNaverError(data.error ?? "분석에 실패했습니다.");
        return;
      }

      applyPrefillFromNaverDraft(
        data.draft as Listing,
        (data.complexOptions as ComplexOption[] | undefined) ?? complexOptions,
        (data.unitTypeCandidates as string[] | undefined) ?? [],
        (data.uncertainFields as string[] | undefined) ?? [],
        data.suggestedComplexName as string | undefined,
      );
      setNaverDuplicateMatch((data.duplicate as DuplicateMatch | undefined) ?? null);
      setNaverMergedPreview((data.mergedPreview as Listing | undefined) ?? null);
    } catch {
      setNaverError("네트워크 오류로 분석에 실패했습니다.");
    } finally {
      setNaverAnalyzing(false);
    }
  }

  /** "기존 매물 업데이트"를 선택하면 병합 미리보기 값을 그대로 등록 폼에 채웁니다. */
  function handleChooseUpdateExisting() {
    if (!naverMergedPreview) return;
    setDraft(naverMergedPreview);
    setFeaturesInput(naverMergedPreview.features.join(", "));
    setComplexMode("existing");
    setNaverDuplicateChoice("update");
  }

  function handleChooseRegisterNew() {
    setNaverDuplicateChoice("new");
  }

  function handleCancelNaverDuplicate() {
    setNaverDuplicateMatch(null);
    setNaverMergedPreview(null);
    setNaverDuplicateChoice(null);
  }

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
    setPendingPhotoFiles([]);
    setPhotoUploadWarnings(null);
    setNaverUrl("");
    setNaverPastedText("");
    setNaverError(null);
    setNaverDuplicateMatch(null);
    setNaverMergedPreview(null);
    setNaverDuplicateChoice(null);
    setNaverUncertainFields(null);
    setNaverUnitTypeCandidates(null);
  }

  /**
   * 신규 등록 화면은 저장 전이라 매물 ID가 없어서, 사진은 매물 생성이 성공한
   * 뒤 그 ID로 하나씩 순서대로 업로드합니다(선택한 순서가 그대로 sort_order가
   * 되어 첫 번째 사진이 대표사진이 됩니다). 일부가 실패해도 매물 자체는 이미
   * 저장됐으니 등록을 되돌리지 않고, 실패한 파일만 경고로 보여줍니다.
   */
  async function uploadPendingPhotos(listingId: string, files: File[]) {
    if (files.length === 0) return;
    const failed: string[] = [];
    for (const file of files) {
      const form = new FormData();
      form.append("file", file);
      try {
        const response = await fetch(`/api/admin/listings/${listingId}/photos`, {
          method: "POST",
          body: form,
        });
        if (!response.ok) {
          const data = await response.json();
          failed.push(`${file.name}: ${data.errors?.[0] ?? "업로드 실패"}`);
        }
      } catch {
        failed.push(`${file.name}: 네트워크 오류`);
      }
    }
    if (failed.length > 0) setPhotoUploadWarnings(failed);
  }

  async function handleSubmit() {
    // 중복이 발견됐는데 아직 관리자가 셋 중 하나를 고르지 않았다면 저장을 막습니다.
    if (naverDuplicateMatch && !naverDuplicateChoice) return;

    setSubmitting(true);
    setSubmitErrors(null);

    try {
      const isUpdatingExisting =
        naverDuplicateChoice === "update" && naverDuplicateMatch;

      const payload: Record<string, unknown> = {
        ...draft,
        id: isUpdatingExisting ? draft.id : undefined, // 신규 등록은 서버가 ID를 자동으로 만들어줍니다.
        features: featuresInput
          .split(",")
          .map((feature) => feature.trim())
          .filter(Boolean),
      };

      if (naverDuplicateChoice === "new") {
        payload.allowDuplicateArticle = true;
      }

      // 접수 건에서 넘어온 경우, 접수 때 올린 사진을 그대로 매물 사진으로 승계합니다.
      if (sourceSubmission && sourceSubmission.photos.length > 0) {
        payload.images = sourceSubmission.photos;
      }

      if (
        !isUpdatingExisting &&
        complexMode === "new" &&
        draft.propertyType !== "상가"
      ) {
        delete payload.complexId;
        payload.newComplex = newComplex;
      }

      const response = await fetch(
        isUpdatingExisting
          ? `/api/listings/${naverDuplicateMatch.listing.id}`
          : "/api/listings",
        {
          method: isUpdatingExisting ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();

      if (!response.ok) {
        setSubmitErrors(data.errors ?? [data.error ?? "등록에 실패했습니다."]);
        return;
      }

      const createdListing = data.listing as Listing;
      setRegistered(createdListing);

      if (pendingPhotoFiles.length > 0) {
        await uploadPendingPhotos(createdListing.id, pendingPhotoFiles);
      }

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

          {photoUploadWarnings && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-left text-sm text-red-600">
              <p className="font-semibold">
                매물은 저장됐지만 일부 사진 업로드에 실패했어요:
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {photoUploadWarnings.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
              <Link
                href={`/admin/listings/${registered.id}/edit`}
                className="mt-2 inline-block font-semibold underline-offset-4 hover:underline"
              >
                수정 화면에서 사진 다시 올리기 →
              </Link>
            </div>
          )}
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
    <div className="mx-auto max-w-3xl px-6 py-10 sm:py-16">
      <p className="text-sm font-semibold tracking-wide text-gold-600">ADMIN</p>
      <h1 className="mt-2 text-2xl font-black text-navy-950 sm:text-3xl">
        매물 등록
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-navy-800/70">
        아래 항목을 채우고 맨 아래 &quot;등록하기&quot; 버튼을 누르면 바로
        저장돼요. 사진을 골라두면 등록과 동시에 함께 올라갑니다.
      </p>

      {sourceSubmission && (
        <div className="mt-4 rounded-md border border-gold-500/30 bg-gold-500/10 px-3 py-2 text-sm text-navy-900">
          <strong>{sourceSubmission.contactName}</strong>님이 접수한 매물
          정보로 미리 채워졌습니다({sourceSubmission.contactPhone}). 공급면적
          · 전용면적 · 방/욕실 수는 접수 내용에 없어 직접 입력해주세요.
        </div>
      )}

      <div className="mt-8 rounded-xl border border-navy-900/10 p-6 sm:p-8">
        <h2 className="text-sm font-bold text-navy-950">네이버 매물 자동 입력</h2>
        <p className="mt-1 text-xs leading-relaxed text-navy-800/60">
          네이버 부동산 매물 URL과 상세 화면에서 복사한 텍스트를 붙여넣고
          분석하면 아래 등록 폼이 자동으로 채워집니다. 분석만으로는 저장되지
          않으며, 내용을 확인·수정한 뒤 맨 아래 &quot;등록하기&quot;를 눌러야
          실제로 등록됩니다.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <Field label="네이버 매물 URL (선택)">
            <input
              type="text"
              value={naverUrl}
              onChange={(event) => setNaverUrl(event.target.value)}
              placeholder="https://new.land.naver.com/complexes/..."
              className={inputClass}
            />
          </Field>
          <Field label="네이버에서 복사한 매물 정보 텍스트">
            <textarea
              value={naverPastedText}
              onChange={(event) => setNaverPastedText(event.target.value)}
              rows={8}
              placeholder="네이버 부동산 매물 상세 화면에서 복사한 텍스트 전체를 붙여넣어주세요."
              className={`${inputClass} resize-y`}
            />
          </Field>
        </div>

        <button
          type="button"
          onClick={handleAnalyzeNaver}
          disabled={naverAnalyzing || !naverPastedText.trim()}
          className="mt-3 rounded-md border border-gold-500 px-5 py-2 text-sm font-bold text-gold-600 transition-colors hover:bg-gold-500/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {naverAnalyzing ? "분석 중..." : "자동 분석하기"}
        </button>

        {naverError && (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {naverError}
          </p>
        )}

        {naverDuplicateMatch && !naverDuplicateChoice && (
          <NaverDuplicatePanel
            duplicate={naverDuplicateMatch}
            mergedPreview={naverMergedPreview ?? undefined}
            onUpdateExisting={handleChooseUpdateExisting}
            onRegisterNew={handleChooseRegisterNew}
            onCancel={handleCancelNaverDuplicate}
          />
        )}

        {naverDuplicateChoice === "update" && naverDuplicateMatch && (
          <div className="mt-3 rounded-md border border-gold-500/30 bg-gold-500/10 px-3 py-2 text-sm text-navy-900">
            <strong>
              {naverDuplicateMatch.listing.complexName}{" "}
              {naverDuplicateMatch.listing.building}
            </strong>{" "}
            매물을 업데이트합니다(새 매물로 등록되지 않습니다).{" "}
            <button
              type="button"
              onClick={handleChooseRegisterNew}
              className="font-semibold text-gold-600 underline-offset-4 hover:underline"
            >
              새 매물로 등록할래요
            </button>
          </div>
        )}

        {naverUncertainFields && (
          <p className="mt-3 rounded-md border border-gold-500/30 bg-gold-500/10 px-3 py-2 text-sm text-navy-900">
            자동으로 확인하지 못한 항목: {naverUncertainFields.join(", ")} — 아래
            폼에서 직접 입력해주세요.
          </p>
        )}

        {naverUnitTypeCandidates && (
          <p className="mt-3 rounded-md border border-gold-500/30 bg-gold-500/10 px-3 py-2 text-sm text-navy-900">
            평형 타입 후보가 여러 개예요({naverUnitTypeCandidates.join(", ")}) —
            아래 &quot;평형 타입&quot;에서 직접 선택해주세요.
          </p>
        )}

        <hr className="my-6 border-navy-900/10" />

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
          onPendingPhotoFilesChange={setPendingPhotoFiles}
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
            disabled={submitting || Boolean(naverDuplicateMatch && !naverDuplicateChoice)}
            className="w-full rounded-md bg-gradient-to-r from-gold-500 to-gold-600 px-6 py-3 text-sm font-bold text-navy-950 shadow-md shadow-gold-500/30 transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {submitting
              ? "저장 중..."
              : naverDuplicateChoice === "update"
                ? "기존 매물 업데이트 저장"
                : "등록하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
