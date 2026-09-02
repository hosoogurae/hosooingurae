"use client";

import { use, useEffect, useState } from "react";
import type { Complex } from "../../../../data/complexes";
import type { ComplexFieldsInput } from "../../../../lib/complexValidation";
import ComplexForm from "../../ComplexForm";
import ComplexPhotoManager from "../../ComplexPhotoManager";
import FloorPlanManager from "../../FloorPlanManager";
import UnitTypePhotoManager from "../../UnitTypePhotoManager";

export default function EditComplexPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [complex, setComplex] = useState<Complex | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/admin/complexes/${id}`);
        const data = await response.json();
        if (!response.ok) {
          if (!cancelled) {
            setLoadError(data.errors?.[0] ?? "단지를 불러오지 못했습니다.");
          }
          return;
        }
        if (!cancelled) {
          setComplex(data.complex as Complex);
        }
      } catch {
        if (!cancelled) {
          setLoadError("네트워크 오류로 단지를 불러오지 못했습니다.");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleUpdate(input: ComplexFieldsInput): Promise<{ error?: string }> {
    try {
      const response = await fetch(`/api/admin/complexes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const responseText = await response.text();
      let data: { errors?: string[]; complex?: Complex } = {};
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        return {
          error: `저장 서버가 올바르지 않은 응답을 반환했습니다. (HTTP ${response.status})`,
        };
      }
      if (!response.ok) {
        return {
          error:
            data.errors?.[0] ?? `저장에 실패했습니다. (HTTP ${response.status})`,
        };
      }
      if (!data.complex) {
        return { error: "저장 응답에 단지 정보가 없습니다." };
      }
      const reloadResponse = await fetch(`/api/admin/complexes/${id}`, {
        cache: "no-store",
      });
      const reloadData = await reloadResponse.json().catch(() => null);
      if (!reloadResponse.ok || !reloadData?.complex) {
        return {
          error: `DB 재조회에 실패했습니다. (${reloadData?.errors?.[0] ?? `HTTP ${reloadResponse.status}`})`,
        };
      }
      setComplex(reloadData.complex as Complex);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
      return {};
    } catch {
      return { error: "네트워크 오류가 발생했습니다." };
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 sm:py-16">
      <p className="text-sm font-semibold tracking-wide text-gold-600">ADMIN</p>
      <h1 className="mt-2 text-2xl font-black text-navy-950 sm:text-3xl">
        단지 정보 수정
      </h1>

      {loadError && (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {loadError}
        </p>
      )}

      {complex === undefined && !loadError && (
        <p className="mt-8 text-sm text-navy-800/50">불러오는 중...</p>
      )}

      {complex && (
        <>
          {savedNotice && (
            <p role="status" className="fixed bottom-6 right-6 z-50 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700 shadow-lg">
              단지 정보가 저장되었습니다.
            </p>
          )}
          <div className="mt-8">
            <ComplexForm
              initial={complex}
              onSubmit={handleUpdate}
              submitLabel="저장"
              allowNaverPaste
            />
          </div>

          <div className="mt-10 rounded-xl border border-navy-900/10 p-6 sm:p-8">
            <h2 className="text-base font-bold text-navy-950">평형 · 평면 타입</h2>
            <p className="mt-1 text-xs text-navy-800/50">
              타입별 공급/전용면적과 평면도 이미지를 관리합니다. 비어있어도
              괜찮습니다 — 나중에 언제든 추가할 수 있습니다.
            </p>
            <div className="mt-4">
              <FloorPlanManager complexId={id} />
            </div>
          </div>

          <div className="mt-10 rounded-xl border border-navy-900/10 p-6 sm:p-8">
            <h2 className="text-base font-bold text-navy-950">사진 관리</h2>
            <p className="mt-1 text-xs text-navy-800/50">
              여기서 올린 사진은 이 단지(또는 같은 타입)의 모든 매물 상세
              페이지에 자동으로 함께 노출됩니다 — 매물마다 따로 올릴 필요가
              없습니다.
            </p>

            <div className="mt-6">
              <h3 className="text-sm font-bold text-navy-950">단지 공통 사진</h3>
              <p className="mt-1 text-xs text-navy-800/50">
                외관·정문·조경·놀이터·주차장·커뮤니티 시설 등 단지 전체에서
                공용으로 쓰이는 사진입니다.
              </p>
              <div className="mt-3">
                <ComplexPhotoManager complexId={id} />
              </div>
            </div>

            <div className="mt-10 border-t border-navy-900/10 pt-8">
              <h3 className="text-sm font-bold text-navy-950">타입별 사진</h3>
              <p className="mt-1 text-xs text-navy-800/50">
                같은 평형 타입(예: 109A)의 실내 구조/내부 사진입니다. 평면도
                도면과는 별개입니다.
              </p>
              <div className="mt-3">
                <UnitTypePhotoManager complexId={id} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
