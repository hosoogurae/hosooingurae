"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import type { Listing } from "../../../../data/listings";
import type { ComplexOption } from "../../../../lib/naverImport";
import { ListingFormFields } from "../../../ListingFields";

export default function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [draft, setDraft] = useState<Listing | null>(null);
  const [complexOptions, setComplexOptions] = useState<ComplexOption[]>([]);
  const [featuresInput, setFeaturesInput] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveErrors, setSaveErrors] = useState<string[] | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [listingRes, complexesRes] = await Promise.all([
          fetch(`/api/listings/${id}`),
          fetch("/api/complexes"),
        ]);
        const listingData = await listingRes.json();
        if (!listingRes.ok) {
          throw new Error(listingData.error ?? "매물을 불러오지 못했습니다.");
        }

        const listing = listingData.listing as Listing;
        setDraft(listing);
        setFeaturesInput(listing.features.join(", "));

        const complexesData = await complexesRes.json();
        setComplexOptions((complexesData.complexOptions ?? []) as ComplexOption[]);
      } catch (err) {
        setLoadError(
          err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
        );
      }
    }

    load();
  }, [id]);

  function updateDraft<K extends keyof Listing>(key: K, value: Listing[K]) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSave() {
    if (!draft) return;

    setSaving(true);
    setSaveErrors(null);
    setSaved(false);

    try {
      const payload: Listing = {
        ...draft,
        features: featuresInput
          .split(",")
          .map((feature) => feature.trim())
          .filter(Boolean),
      };

      const response = await fetch(`/api/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        setSaveErrors(data.errors ?? [data.error ?? "수정에 실패했습니다."]);
        return;
      }

      setSaved(true);
    } catch {
      setSaveErrors(["네트워크 오류로 수정에 실패했습니다."]);
    } finally {
      setSaving(false);
    }
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
          ← 매물 관리
        </Link>
      </div>
      <h1 className="mt-2 text-2xl font-black text-navy-950 sm:text-3xl">
        매물 수정
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-navy-800/70">
        수정 후 저장을 눌러야 반영됩니다.
      </p>

      {loadError && (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {loadError}
        </p>
      )}

      {!loadError && !draft && (
        <p className="mt-8 text-sm text-navy-800/50">불러오는 중...</p>
      )}

      {draft && (
        <div className="mt-8 rounded-xl border border-navy-900/10 p-6 sm:p-8">
          <ListingFormFields
            draft={draft}
            complexOptions={complexOptions}
            featuresInput={featuresInput}
            onChangeField={updateDraft}
            onChangeFeaturesInput={setFeaturesInput}
            idEditable={false}
          />

          {draft.rawSourceText && (
            <details className="mt-4 rounded-md border border-navy-900/10 p-3 text-sm">
              <summary className="cursor-pointer font-semibold text-navy-800/70">
                가져오기 원문 보기 (관리자 전용, 공개되지 않음)
              </summary>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-navy-800/70">
                {draft.rawSourceText}
              </pre>
            </details>
          )}

          {saveErrors && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              <ul className="list-disc space-y-0.5 pl-4">
                {saveErrors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          )}

          {saved && (
            <p className="mt-4 rounded-md border border-gold-500/30 bg-gold-500/10 px-3 py-2 text-sm text-gold-600">
              저장되었습니다.
            </p>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-gradient-to-r from-gold-500 to-gold-600 px-6 py-2.5 text-sm font-bold text-navy-950 shadow-md shadow-gold-500/30 transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "저장 중..." : "저장하기"}
            </button>
            <Link
              href="/admin/listings"
              className="rounded-md border border-navy-900/15 px-6 py-2.5 text-center text-sm font-bold text-navy-800 transition-colors hover:border-gold-500 hover:text-gold-600"
            >
              목록으로
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
