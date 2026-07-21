"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import type { Listing } from "../../data/listings";
import type { ComplexOption } from "../../lib/naverImport";
import { Field, ListingFormFields, inputClass } from "../ListingFields";

type Step = "input" | "preview" | "done";

interface DuplicateInfo {
  listingId: string;
  priceLabel: string;
  editUrl: string;
}

interface ImportResponse {
  draft: Listing;
  complexOptions: ComplexOption[];
  uncertainFields: string[];
  suggestedComplexName?: string;
}

export default function AdminImportPage() {
  const [step, setStep] = useState<Step>("input");
  const [url, setUrl] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<DuplicateInfo | null>(null);

  const [draft, setDraft] = useState<Listing | null>(null);
  const [complexOptions, setComplexOptions] = useState<ComplexOption[]>([]);
  const [uncertainFields, setUncertainFields] = useState<string[]>([]);
  const [featuresInput, setFeaturesInput] = useState("");

  const [newComplexName, setNewComplexName] = useState("");
  const [newComplexAddress, setNewComplexAddress] = useState("");
  const [creatingComplex, setCreatingComplex] = useState(false);
  const [createComplexError, setCreateComplexError] = useState<string | null>(
    null,
  );

  const [submitting, setSubmitting] = useState(false);
  const [submitErrors, setSubmitErrors] = useState<string[] | null>(null);
  const [registeredListing, setRegisteredListing] = useState<Listing | null>(
    null,
  );

  function updateDraft<K extends keyof Listing>(key: K, value: Listing[K]) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleImport(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setDuplicate(null);
    setLoading(true);

    try {
      const response = await fetch("/api/import-naver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, pastedText }),
      });
      const data = await response.json();

      if (response.status === 409 && data.duplicate) {
        setDuplicate(data.duplicate as DuplicateInfo);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error ?? "매물 정보를 분석하지 못했습니다.");
      }

      const payload = data as ImportResponse;
      setDraft(payload.draft);
      setComplexOptions(payload.complexOptions);
      setUncertainFields(payload.uncertainFields);
      setFeaturesInput(payload.draft.features.join(", "));
      setNewComplexName(payload.suggestedComplexName ?? "");
      setNewComplexAddress("");
      setCreateComplexError(null);
      setStep("preview");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    if (!draft) return;

    setSubmitting(true);
    setSubmitErrors(null);

    try {
      const payload: Listing = {
        ...draft,
        features: featuresInput
          .split(",")
          .map((feature) => feature.trim())
          .filter(Boolean),
      };

      const response = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (response.status === 409 && data.duplicate) {
        setDuplicate(data.duplicate as DuplicateInfo);
        return;
      }

      if (!response.ok) {
        setSubmitErrors(data.errors ?? [data.error ?? "등록에 실패했습니다."]);
        return;
      }

      setRegisteredListing(data.listing as Listing);
      setStep("done");
    } catch {
      setSubmitErrors(["네트워크 오류로 등록에 실패했습니다."]);
    } finally {
      setSubmitting(false);
    }
  }

  /**
   * "새 단지 등록" 버튼을 눌렀을 때만 호출됩니다(자동 등록 없음). 등록되면
   * 그 자리에서 draft.complexId에 바로 연결하고 텍스트를 다시 붙여넣지 않아도
   * 되도록 기존 미리보기 상태를 그대로 유지합니다.
   */
  async function handleCreateComplex() {
    if (!draft) return;

    setCreatingComplex(true);
    setCreateComplexError(null);

    try {
      const response = await fetch("/api/complexes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newComplexName,
          address: newComplexAddress,
          propertyType: draft.propertyType,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setCreateComplexError(data.errors?.[0] ?? "단지 등록에 실패했습니다.");
        return;
      }

      const complex = data.complex as { id: string; name: string; address: string };
      setComplexOptions((prev) => [
        ...prev,
        { id: complex.id, name: complex.name, address: complex.address },
      ]);
      updateDraft("complexId", complex.id);
    } catch {
      setCreateComplexError("네트워크 오류로 단지 등록에 실패했습니다.");
    } finally {
      setCreatingComplex(false);
    }
  }

  function resetFlow() {
    setStep("input");
    setUrl("");
    setPastedText("");
    setDraft(null);
    setError(null);
    setDuplicate(null);
    setUncertainFields([]);
    setSubmitErrors(null);
    setRegisteredListing(null);
    setNewComplexName("");
    setNewComplexAddress("");
    setCreateComplexError(null);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold tracking-wide text-gold-600">
          ADMIN
        </p>
        <Link
          href="/admin"
          className="text-sm font-medium text-navy-800/60 underline-offset-4 hover:text-gold-600 hover:underline"
        >
          ← 매물 등록
        </Link>
      </div>
      <h1 className="mt-2 text-2xl font-black text-navy-950 sm:text-3xl">
        네이버 매물 가져오기
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-navy-800/70">
        네이버 부동산 매물 상세 화면에서 정보를 <strong>드래그해서 복사</strong>한
        뒤 아래에 붙여넣으면 매물 등록 폼에 자동으로 채워드립니다. 저희 서버가
        네이버에 직접 접속하지는 않으니, 붙여넣은 텍스트에서 확인되지 않는
        항목은 직접 입력해주세요.
      </p>
      <p className="mt-2 text-xs text-navy-800/50">
        ※ 이 페이지는 관리자용 도구이며 별도 로그인 보호가 적용되어 있지
        않습니다. 실제 운영 전 접근 제한을 추가하는 것을 권장합니다.
      </p>

      {step === "input" && (
        <form
          onSubmit={handleImport}
          className="mt-8 rounded-xl border border-navy-900/10 p-6 sm:p-8"
        >
          <Field label="네이버 부동산 URL (선택)" hint="입력하면 매물번호로 중복 등록을 막아줍니다.">
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://new.land.naver.com/complexes/..."
              className={inputClass}
            />
          </Field>

          <Field
            label="네이버 매물 정보 붙여넣기"
            full
            className="mt-4"
            hint="네이버 부동산 매물 상세 화면의 내용을 그대로 복사해 붙여넣어주세요."
          >
            <textarea
              required
              value={pastedText}
              onChange={(event) => setPastedText(event.target.value)}
              rows={10}
              placeholder={"예)\n호수마을e편한세상2단지\n매매 4억 2,000\n공급/전용면적 109.04㎡/84.87㎡\n방향 남향\n..."}
              className={inputClass}
            />
          </Field>

          {duplicate && (
            <div className="mt-3 rounded-md border border-gold-500/30 bg-gold-500/10 px-3 py-2 text-sm text-navy-900">
              이미 등록된 매물입니다: <strong>{duplicate.priceLabel}</strong>
              <br />
              <Link
                href={duplicate.editUrl}
                className="font-semibold text-gold-600 underline-offset-4 hover:underline"
              >
                기존 매물 수정하러 가기 →
              </Link>
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || pastedText.trim().length === 0}
            className="mt-6 rounded-md bg-gradient-to-r from-gold-500 to-gold-600 px-6 py-2.5 text-sm font-bold text-navy-950 shadow-md shadow-gold-500/30 transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "분석 중..." : "정보 채우기"}
          </button>
        </form>
      )}

      {step === "preview" && draft && (
        <div className="mt-8 rounded-xl border border-navy-900/10 p-6 sm:p-8">
          <h2 className="text-lg font-bold text-navy-950">미리보기 · 수정</h2>
          <p className="mt-1 text-sm text-navy-800/60">
            등록하기 전에 내용을 확인하고 필요한 부분을 수정해주세요. 임시저장
            (비공개) 상태로 시작하며, 검토가 끝나면 매물 관리 화면에서 공개로
            전환할 수 있습니다.
          </p>

          {uncertainFields.length > 0 && (
            <div className="mt-4 rounded-md border border-gold-500/30 bg-gold-500/10 px-3 py-2 text-sm text-navy-900">
              다음 항목은 텍스트에서 확인하지 못해 비어있습니다. 아래에서 직접
              입력해주세요: <strong>{uncertainFields.join(", ")}</strong>
            </div>
          )}

          {!draft.complexId && (
            <div className="mt-4 rounded-md border border-gold-500/30 bg-gold-500/10 p-3 text-sm text-navy-900">
              <p className="font-semibold">미등록 단지입니다.</p>
              <p className="mt-1 text-navy-800/70">
                기존 단지 목록에서 일치하는 단지를 찾지 못했습니다. 새 단지로
                등록하거나, 아래 목록에서 기존 단지를 직접 선택해주세요.
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="단지명">
                  <input
                    value={newComplexName}
                    onChange={(event) => setNewComplexName(event.target.value)}
                    placeholder="예: 김포한강아이파크"
                    className={inputClass}
                  />
                </Field>
                <Field label="주소 (선택, 모르면 비워두세요)">
                  <input
                    value={newComplexAddress}
                    onChange={(event) => setNewComplexAddress(event.target.value)}
                    placeholder="나중에 매물 관리 화면에서 채울 수 있습니다"
                    className={inputClass}
                  />
                </Field>
              </div>

              {createComplexError && (
                <p className="mt-2 text-sm text-red-600">{createComplexError}</p>
              )}

              <button
                type="button"
                onClick={handleCreateComplex}
                disabled={creatingComplex || newComplexName.trim().length === 0}
                className="mt-3 rounded-md border border-gold-500/40 bg-white px-4 py-2 text-sm font-bold text-navy-900 transition-colors hover:border-gold-500 hover:bg-gold-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creatingComplex ? "등록 중..." : "새 단지 등록"}
              </button>
            </div>
          )}

          <ListingFormFields
            draft={draft}
            complexOptions={complexOptions}
            featuresInput={featuresInput}
            onChangeField={updateDraft}
            onChangeFeaturesInput={setFeaturesInput}
          />

          <details className="mt-4 rounded-md border border-navy-900/10 p-3 text-sm">
            <summary className="cursor-pointer font-semibold text-navy-800/70">
              붙여넣은 원문 보기 (관리자 전용, 공개되지 않음)
            </summary>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-navy-800/70">
              {draft.rawSourceText}
            </pre>
          </details>

          {duplicate && (
            <div className="mt-4 rounded-md border border-gold-500/30 bg-gold-500/10 px-3 py-2 text-sm text-navy-900">
              이미 등록된 매물입니다: <strong>{duplicate.priceLabel}</strong>
              <br />
              <Link
                href={duplicate.editUrl}
                className="font-semibold text-gold-600 underline-offset-4 hover:underline"
              >
                기존 매물 수정하러 가기 →
              </Link>
            </div>
          )}

          {submitErrors && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              <ul className="list-disc space-y-0.5 pl-4">
                {submitErrors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleRegister}
              disabled={submitting}
              className="rounded-md bg-gradient-to-r from-gold-500 to-gold-600 px-6 py-2.5 text-sm font-bold text-navy-950 shadow-md shadow-gold-500/30 transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "등록 중..." : "임시저장으로 등록하기"}
            </button>
            <button
              type="button"
              onClick={resetFlow}
              className="rounded-md border border-navy-900/15 px-6 py-2.5 text-sm font-bold text-navy-800 transition-colors hover:border-gold-500 hover:text-gold-600"
            >
              다시 가져오기
            </button>
          </div>
        </div>
      )}

      {step === "done" && registeredListing && (
        <div className="mt-8 rounded-xl border border-navy-900/10 p-6 text-center sm:p-8">
          <p className="text-sm font-semibold text-gold-600">등록 완료</p>
          <h2 className="mt-2 text-lg font-bold text-navy-950">
            임시저장 상태로 매물이 등록되었습니다.
          </h2>
          <p className="mt-2 text-sm text-navy-800/60">
            아직 홈페이지에는 공개되지 않았습니다. 내용을 다시 확인한 뒤
            공개로 전환해주세요.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href={`/admin/listings/${registeredListing.id}/edit`}
              className="rounded-md bg-gradient-to-r from-gold-500 to-gold-600 px-6 py-2.5 text-sm font-bold text-navy-950 shadow-md shadow-gold-500/30"
            >
              등록된 매물 확인/공개
            </Link>
            <button
              type="button"
              onClick={resetFlow}
              className="rounded-md border border-navy-900/15 px-6 py-2.5 text-sm font-bold text-navy-800 transition-colors hover:border-gold-500 hover:text-gold-600"
            >
              다른 매물 가져오기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
