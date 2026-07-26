"use client";

import { useEffect, useState } from "react";
import type { FloorPlanImage } from "../../data/floorPlans";
import type { UnitTypeImage } from "../../data/unitTypeImages";

interface PendingFile {
  key: string;
  file: File;
  previewUrl: string;
}

interface ApiErrorDetail {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
}

function formatErrorDetail(detail: ApiErrorDetail | undefined): string {
  if (!detail) return "";
  const parts = [
    detail.code && `code: ${detail.code}`,
    detail.message && `message: ${detail.message}`,
    detail.details && `details: ${detail.details}`,
    detail.hint && `hint: ${detail.hint}`,
  ].filter(Boolean);
  return parts.length > 0 ? ` [${parts.join(" / ")}]` : "";
}

/**
 * 타입별 실내 공통 사진(109A, 109F 등) 관리 UI. 상단에서 이 단지에 이미
 * 등록된 평형 타입(기존 평면도 관리 화면의 unitType 목록, /api/admin/floor-plans
 * 재사용)을 골라, 그 타입의 사진만 업로드/삭제/순서변경/대표사진 지정합니다.
 * 평면도 도면과 달리 실제 촬영 사진이라 ListingPhotoManager와 같은 평탄한
 * 그리드 + 순서변경 UI를 씁니다.
 */
export default function UnitTypePhotoManager({ complexId }: { complexId: string }) {
  const [unitTypes, setUnitTypes] = useState<string[] | null>(null);
  const [selectedUnitType, setSelectedUnitType] = useState<string>("");
  const [unitTypesError, setUnitTypesError] = useState<string | null>(null);

  const [images, setImages] = useState<UnitTypeImage[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[] | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  // 이 단지에 등록된 평형 타입 목록(기존 평면도 데이터 기준)을 불러옵니다.
  useEffect(() => {
    let cancelled = false;

    async function loadUnitTypes() {
      if (!complexId) {
        setUnitTypes([]);
        return;
      }
      setUnitTypesError(null);
      try {
        const response = await fetch(
          `/api/admin/floor-plans?complexId=${encodeURIComponent(complexId)}`,
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.errors?.[0] ?? "타입 목록을 불러오지 못했습니다.");
        }
        const types = Array.from(
          new Set((data.images as FloorPlanImage[]).map((img) => img.unitType)),
        ).sort((a, b) => a.localeCompare(b));
        if (cancelled) return;
        setUnitTypes(types);
        setSelectedUnitType((prev) => (prev && types.includes(prev) ? prev : types[0] ?? ""));
      } catch (err) {
        if (!cancelled) {
          setUnitTypesError(
            err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
          );
          setUnitTypes([]);
        }
      }
    }

    loadUnitTypes();
    return () => {
      cancelled = true;
    };
  }, [complexId]);

  async function loadImages(unitType: string) {
    if (!complexId || !unitType) {
      setImages([]);
      return;
    }
    setLoadError(null);
    try {
      const response = await fetch(
        `/api/admin/unit-type-images?complexId=${encodeURIComponent(
          complexId,
        )}&unitType=${encodeURIComponent(unitType)}`,
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.errors?.[0] ?? "타입 사진을 불러오지 못했습니다.");
      }
      setImages(data.images as UnitTypeImage[]);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
      );
      setImages([]);
    }
  }

  useEffect(() => {
    async function run() {
      if (selectedUnitType) {
        await loadImages(selectedUnitType);
      } else {
        setImages(null);
      }
    }
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUnitType]);

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const next: PendingFile[] = Array.from(fileList).map((file) => ({
      key: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setPendingFiles((prev) => [...prev, ...next]);
  }

  function removePendingFile(key: string) {
    setPendingFiles((prev) => {
      const target = prev.find((item) => item.key === key);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.key !== key);
    });
  }

  async function handleUploadAll() {
    if (!selectedUnitType) {
      setUploadErrors(["타입을 먼저 선택해주세요."]);
      return;
    }

    setUploading(true);
    setUploadErrors(null);
    const failed: string[] = [];

    for (const item of pendingFiles) {
      const form = new FormData();
      form.append("complexId", complexId);
      form.append("unitType", selectedUnitType);
      form.append("file", item.file);

      try {
        const response = await fetch("/api/admin/unit-type-images", {
          method: "POST",
          body: form,
        });
        const data = await response.json();
        if (!response.ok) {
          const message = data.errors?.[0] ?? "업로드 실패";
          failed.push(`${item.file.name}: ${message}${formatErrorDetail(data.errorDetail)}`);
        }
      } catch {
        failed.push(`${item.file.name}: 네트워크 오류`);
      }
    }

    for (const item of pendingFiles) {
      URL.revokeObjectURL(item.previewUrl);
    }
    setPendingFiles([]);
    setUploading(false);
    if (failed.length > 0) setUploadErrors(failed);
    await loadImages(selectedUnitType);
  }

  async function handleDelete(id: string) {
    if (!confirm("이 사진을 삭제할까요? 되돌릴 수 없습니다.")) return;
    setDeletingId(id);
    try {
      const response = await fetch(
        `/api/admin/unit-type-images/${id}?complexId=${encodeURIComponent(complexId)}`,
        { method: "DELETE" },
      );
      const data = await response.json();
      if (!response.ok) {
        setLoadError(data.errors?.[0] ?? "삭제에 실패했습니다.");
        return;
      }
      await loadImages(selectedUnitType);
    } catch {
      setLoadError("네트워크 오류가 발생했습니다.");
    } finally {
      setDeletingId(null);
    }
  }

  async function persistOrder(next: UnitTypeImage[]) {
    setReordering(true);
    try {
      const response = await fetch("/api/admin/unit-type-images/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complexId,
          unitType: selectedUnitType,
          orderedIds: next.map((img) => img.id),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setLoadError(data.errors?.[0] ?? "순서 저장에 실패했습니다.");
        return;
      }
      setImages(data.images as UnitTypeImage[]);
    } catch {
      setLoadError("네트워크 오류로 순서를 저장하지 못했습니다.");
    } finally {
      setReordering(false);
    }
  }

  function movePhoto(index: number, direction: -1 | 1) {
    const current = images ?? [];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= current.length) return;
    const next = [...current];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setImages(next);
    persistOrder(next);
  }

  function setPrimary(index: number) {
    if (index === 0) return;
    const current = images ?? [];
    const next = [current[index], ...current.slice(0, index), ...current.slice(index + 1)];
    setImages(next);
    persistOrder(next);
  }

  return (
    <div>
      {unitTypesError && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {unitTypesError}
        </p>
      )}

      {unitTypes !== null && unitTypes.length === 0 && (
        <p className="rounded-xl border border-navy-900/10 px-6 py-8 text-center text-sm text-navy-800/50">
          먼저 위 &quot;평형 · 평면 타입&quot;에 타입을 하나 이상 등록해주세요.
        </p>
      )}

      {unitTypes !== null && unitTypes.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-navy-800/60">타입</label>
            <select
              value={selectedUnitType}
              onChange={(event) => setSelectedUnitType(event.target.value)}
              className="rounded-md border border-navy-900/15 bg-white px-3 py-2 text-sm text-navy-900 outline-none focus:border-gold-500"
            >
              {unitTypes.map((unitType) => (
                <option key={unitType} value={unitType}>
                  {unitType}
                </option>
              ))}
            </select>
          </div>

          {loadError && (
            <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {loadError}
            </p>
          )}

          <div className="mt-4 rounded-xl border border-navy-900/10 p-6 sm:p-8">
            <p className="text-sm font-semibold text-navy-900">
              {selectedUnitType} 사진 업로드
            </p>
            <p className="mt-1 text-xs text-navy-800/50">
              이 타입의 실내 구조/내부 사진을 여러 장 올릴 수 있습니다. 같은
              단지·같은 타입의 모든 매물이 이 사진을 그대로 재사용합니다.
            </p>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => handleFilesSelected(event.target.files)}
              className="mt-3 text-sm"
            />

            {pendingFiles.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {pendingFiles.map((item) => (
                  <div key={item.key} className="relative flex flex-col gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.previewUrl}
                      alt=""
                      className="aspect-square w-full rounded-md object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePendingFile(item.key)}
                      className="text-xs font-semibold text-red-600 hover:underline"
                    >
                      제외
                    </button>
                  </div>
                ))}
              </div>
            )}

            {uploadErrors && (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                <ul className="list-disc space-y-0.5 pl-4">
                  {uploadErrors.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </div>
            )}

            {pendingFiles.length > 0 && (
              <button
                type="button"
                onClick={handleUploadAll}
                disabled={uploading}
                className="mt-4 rounded-md bg-gradient-to-r from-gold-500 to-gold-600 px-6 py-2.5 text-sm font-bold text-navy-950 shadow-md shadow-gold-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? "업로드 중..." : `${pendingFiles.length}개 파일 일괄 업로드`}
              </button>
            )}
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-bold text-navy-950">
              등록된 {selectedUnitType} 사진
            </h3>
            {reordering && (
              <p className="mt-2 text-xs text-navy-800/50">순서 저장 중...</p>
            )}

            {images === null && (
              <p className="mt-4 text-sm text-navy-800/50">불러오는 중...</p>
            )}
            {images !== null && images.length === 0 && (
              <p className="mt-4 rounded-xl border border-navy-900/10 px-6 py-12 text-center text-sm text-navy-800/50">
                등록된 사진이 없습니다.
              </p>
            )}

            {images !== null && images.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.map((image, index) => (
                  <div
                    key={image.id}
                    className="relative flex flex-col gap-1.5 rounded-md border border-navy-900/10 p-2"
                  >
                    {index === 0 && (
                      <span className="absolute left-3 top-3 z-10 rounded-full bg-gold-500/90 px-2 py-0.5 text-[10px] font-bold text-navy-950">
                        대표사진
                      </span>
                    )}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.url}
                      alt={`${image.unitType} 사진`}
                      className="aspect-[4/3] w-full rounded-md object-cover"
                    />
                    <div className="flex items-center justify-between gap-1 text-xs">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => movePhoto(index, -1)}
                          disabled={index === 0}
                          className="rounded px-1.5 py-0.5 font-semibold text-navy-800/60 hover:text-gold-600 disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label="앞으로 이동"
                        >
                          ◀
                        </button>
                        <button
                          type="button"
                          onClick={() => movePhoto(index, 1)}
                          disabled={index === images.length - 1}
                          className="rounded px-1.5 py-0.5 font-semibold text-navy-800/60 hover:text-gold-600 disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label="뒤로 이동"
                        >
                          ▶
                        </button>
                        {index !== 0 && (
                          <button
                            type="button"
                            onClick={() => setPrimary(index)}
                            className="rounded px-1.5 py-0.5 font-semibold text-navy-800/60 hover:text-gold-600"
                          >
                            대표로
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(image.id)}
                        disabled={deletingId === image.id}
                        className="font-semibold text-red-600 hover:underline disabled:opacity-50"
                      >
                        {deletingId === image.id ? "삭제 중..." : "삭제"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
