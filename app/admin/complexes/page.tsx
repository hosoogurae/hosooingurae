"use client";

import { useEffect, useState } from "react";
import type { Complex } from "../../data/complexes";

const inputClass =
  "rounded-md border border-navy-900/15 bg-white px-3 py-2 text-sm text-navy-900 outline-none focus:border-gold-500";

interface EditState {
  name: string;
  address: string;
  propertyType: string;
  /** 입력창은 문자열로 들고 있다가 저장 시점에 숫자로 바꿉니다(빈 값은 "모름"으로 저장). */
  subwayWalkMinutes: string;
}

export default function AdminComplexesPage() {
  const [complexes, setComplexes] = useState<Complex[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<EditState>({
    name: "",
    address: "",
    propertyType: "",
    subwayWalkMinutes: "",
  });
  const [saving, setSaving] = useState(false);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/admin/complexes");
        const data = await response.json();
        if (!response.ok) {
          if (!cancelled) {
            setLoadError(data.error ?? "단지 목록을 불러오지 못했습니다.");
          }
          return;
        }
        if (!cancelled) {
          setComplexes(data.complexes as Complex[]);
        }
      } catch {
        if (!cancelled) {
          setLoadError("네트워크 오류로 단지 목록을 불러오지 못했습니다.");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function startEdit(complex: Complex) {
    setEditingId(complex.id);
    setEditValue({
      name: complex.name,
      address: complex.address,
      propertyType: complex.propertyType ?? "",
      subwayWalkMinutes:
        complex.transportation.subwayWalkMinutes !== undefined
          ? String(complex.transportation.subwayWalkMinutes)
          : "",
    });
    setRowErrors((prev) => ({ ...prev, [complex.id]: "" }));
  }

  async function handleSave(id: string) {
    setSaving(true);
    try {
      const trimmedMinutes = editValue.subwayWalkMinutes.trim();
      const response = await fetch(`/api/admin/complexes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editValue.name,
          address: editValue.address,
          propertyType: editValue.propertyType,
          subwayWalkMinutes: trimmedMinutes === "" ? null : Number(trimmedMinutes),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setRowErrors((prev) => ({
          ...prev,
          [id]: data.errors?.[0] ?? "수정에 실패했습니다.",
        }));
        return;
      }

      setComplexes(
        (prev) =>
          prev?.map((item) => (item.id === id ? (data.complex as Complex) : item)) ??
          null,
      );
      setEditingId(null);
    } catch {
      setRowErrors((prev) => ({ ...prev, [id]: "네트워크 오류가 발생했습니다." }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 sm:py-16">
      <p className="text-sm font-semibold tracking-wide text-gold-600">ADMIN</p>
      <h1 className="mt-2 text-2xl font-black text-navy-950 sm:text-3xl">
        단지 정보 관리
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-navy-800/70">
        등록된 단지의 단지명·주소·건축물 용도를 확인하고 고칠 수 있습니다.
      </p>

      {loadError && (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {loadError}
        </p>
      )}

      {complexes === null ? (
        <p className="mt-8 text-sm text-navy-800/50">불러오는 중...</p>
      ) : complexes.length === 0 ? (
        <p className="mt-8 rounded-xl border border-navy-900/10 px-6 py-16 text-center text-sm text-navy-800/50">
          등록된 단지가 없습니다.
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {complexes.map((complex) => (
            <li
              key={complex.id}
              className="rounded-xl border border-navy-900/10 p-5"
            >
              {editingId === complex.id ? (
                <div className="flex flex-col gap-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-navy-800/60">
                      단지명
                    </span>
                    <input
                      value={editValue.name}
                      onChange={(event) =>
                        setEditValue((prev) => ({ ...prev, name: event.target.value }))
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-navy-800/60">
                      주소
                    </span>
                    <input
                      value={editValue.address}
                      onChange={(event) =>
                        setEditValue((prev) => ({
                          ...prev,
                          address: event.target.value,
                        }))
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-navy-800/60">
                      건축물 용도
                    </span>
                    <input
                      value={editValue.propertyType}
                      onChange={(event) =>
                        setEditValue((prev) => ({
                          ...prev,
                          propertyType: event.target.value,
                        }))
                      }
                      placeholder="예: 공동주택"
                      className={inputClass}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-navy-800/60">
                      지하철 도보 시간(분)
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={editValue.subwayWalkMinutes}
                      onChange={(event) =>
                        setEditValue((prev) => ({
                          ...prev,
                          subwayWalkMinutes: event.target.value,
                        }))
                      }
                      placeholder={
                        complex.transportation.subway
                          ? `예: ${complex.transportation.subway}까지 12`
                          : "예: 12 (비우면 모름으로 저장)"
                      }
                      className={inputClass}
                    />
                  </label>

                  {rowErrors[complex.id] && (
                    <p className="text-xs text-red-600">{rowErrors[complex.id]}</p>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSave(complex.id)}
                      disabled={saving}
                      className="rounded-md bg-gradient-to-r from-gold-500 to-gold-600 px-5 py-2 text-sm font-bold text-navy-950 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? "저장 중..." : "저장"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      disabled={saving}
                      className="rounded-md border border-navy-900/15 px-5 py-2 text-sm font-bold text-navy-800"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-bold text-navy-950">
                      {complex.name}
                    </p>
                    <p className="mt-1 text-sm text-navy-800/70">
                      {complex.address || "주소 미입력"}
                    </p>
                    {complex.propertyType && (
                      <p className="mt-0.5 text-xs text-navy-800/50">
                        {complex.propertyType}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-navy-800/50">
                      {complex.transportation.subway
                        ? `${complex.transportation.subway} · ${
                            complex.transportation.subwayWalkMinutes !== undefined
                              ? `도보 약 ${complex.transportation.subwayWalkMinutes}분`
                              : "도보 시간 미입력"
                          }`
                        : "지하철 정보 미등록"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => startEdit(complex)}
                    className="rounded-md border border-navy-900/15 px-4 py-2 text-sm font-bold text-navy-800 transition-colors hover:border-gold-500 hover:text-gold-600"
                  >
                    수정
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
