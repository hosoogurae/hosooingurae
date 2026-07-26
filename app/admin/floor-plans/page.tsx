"use client";

import { useEffect, useState } from "react";
import type { ComplexOption } from "../../lib/naverImport";
import FloorPlanManager from "../complexes/FloorPlanManager";

const inputClass =
  "rounded-md border border-navy-900/15 bg-white px-3 py-2 text-sm text-navy-900 outline-none focus:border-gold-500";

export default function AdminFloorPlansPage() {
  const [complexOptions, setComplexOptions] = useState<ComplexOption[]>([]);
  const [complexId, setComplexId] = useState("");

  useEffect(() => {
    async function loadComplexes() {
      try {
        const response = await fetch("/api/complexes");
        const data = await response.json();
        if (response.ok) {
          const options = data.complexOptions as ComplexOption[];
          setComplexOptions(options);
          if (options.length > 0) {
            setComplexId((prev) => prev || options[0].id);
          }
        }
      } catch {
        // 단지 목록을 못 가져와도 화면 자체는 계속 쓸 수 있게 둡니다.
      }
    }
    loadComplexes();
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <p className="text-sm font-semibold tracking-wide text-gold-600">
        ADMIN
      </p>
      <h1 className="mt-2 text-2xl font-black text-navy-950 sm:text-3xl">
        단지 평면도 관리
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-navy-800/70">
        단지 · 타입별로 평면도 이미지를 등록하면, 같은 단지·같은 타입(매물
        수정 화면의 &quot;평형 타입&quot;)의 매물 상세페이지에 자동으로
        노출됩니다.
      </p>

      <div className="mt-8">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-navy-800/60">단지 선택</span>
          <select
            value={complexId}
            onChange={(event) => setComplexId(event.target.value)}
            className={inputClass}
          >
            {complexOptions.length === 0 && <option value="">단지 없음</option>}
            {complexOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6">
        <FloorPlanManager complexId={complexId} />
      </div>
    </div>
  );
}
