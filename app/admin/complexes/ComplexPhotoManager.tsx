"use client";

import { useEffect, useState } from "react";
import {
  COMPLEX_IMAGE_CATEGORIES,
  COMPLEX_IMAGE_CATEGORY_LABELS,
  type ComplexImage,
  type ComplexImageCategory,
} from "../../data/complexImages";

interface PendingFile {
  key: string;
  file: File;
  category: ComplexImageCategory;
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
 * 단지 공통 사진(외관/조경/놀이터 등) 관리 UI. complexId만 받아 자체적으로
 * fetch하는 자기완결형 컴포넌트로, FloorPlanManager와 같은 자리
 * (/admin/complexes/[id]/edit)에 붙입니다. 정렬/대표사진은 단지 전체에서
 * 하나의 순서(카테고리별로 나뉘지 않음)입니다.
 */
export default function ComplexPhotoManager({ complexId }: { complexId: string }) {
  const [images, setImages] = useState<ComplexImage[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [defaultCategory, setDefaultCategory] =
    useState<ComplexImageCategory>("exterior");
  const [uploading, setUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[] | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  async function loadImages() {
    if (!complexId) {
      setImages([]);
      return;
    }
    setLoadError(null);
    try {
      const response = await fetch(
        `/api/admin/complex-images?complexId=${encodeURIComponent(complexId)}`,
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.errors?.[0] ?? "단지 공통 사진을 불러오지 못했습니다.");
      }
      setImages(data.images as ComplexImage[]);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
      );
      setImages([]);
    }
  }

  useEffect(() => {
    async function run() {
      await loadImages();
    }
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complexId]);

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const next: PendingFile[] = Array.from(fileList).map((file) => ({
      key: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      file,
      category: defaultCategory,
      previewUrl: URL.createObjectURL(file),
    }));
    setPendingFiles((prev) => [...prev, ...next]);
  }

  function updatePendingCategory(key: string, category: ComplexImageCategory) {
    setPendingFiles((prev) =>
      prev.map((item) => (item.key === key ? { ...item, category } : item)),
    );
  }

  function removePendingFile(key: string) {
    setPendingFiles((prev) => {
      const target = prev.find((item) => item.key === key);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.key !== key);
    });
  }

  async function handleUploadAll() {
    if (!complexId) {
      setUploadErrors(["단지를 먼저 선택해주세요."]);
      return;
    }

    setUploading(true);
    setUploadErrors(null);
    const failed: string[] = [];

    for (const item of pendingFiles) {
      const form = new FormData();
      form.append("complexId", complexId);
      form.append("category", item.category);
      form.append("file", item.file);

      try {
        const response = await fetch("/api/admin/complex-images", {
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
    await loadImages();
  }

  async function handleCategoryChange(id: string, category: ComplexImageCategory) {
    setRowErrors((prev) => ({ ...prev, [id]: "" }));
    try {
      const response = await fetch(`/api/admin/complex-images/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      const data = await response.json();
      if (!response.ok) {
        setRowErrors((prev) => ({
          ...prev,
          [id]: data.errors?.[0] ?? "분류 변경에 실패했습니다.",
        }));
        return;
      }
      await loadImages();
    } catch {
      setRowErrors((prev) => ({ ...prev, [id]: "네트워크 오류가 발생했습니다." }));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("이 사진을 삭제할까요? 되돌릴 수 없습니다.")) return;
    setDeletingId(id);
    try {
      const response = await fetch(
        `/api/admin/complex-images/${id}?complexId=${encodeURIComponent(complexId)}`,
        { method: "DELETE" },
      );
      const data = await response.json();
      if (!response.ok) {
        setRowErrors((prev) => ({
          ...prev,
          [id]: data.errors?.[0] ?? "삭제에 실패했습니다.",
        }));
        return;
      }
      await loadImages();
    } catch {
      setRowErrors((prev) => ({ ...prev, [id]: "네트워크 오류가 발생했습니다." }));
    } finally {
      setDeletingId(null);
    }
  }

  async function persistOrder(next: ComplexImage[]) {
    setReordering(true);
    try {
      const response = await fetch("/api/admin/complex-images/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complexId, orderedIds: next.map((img) => img.id) }),
      });
      const data = await response.json();
      if (!response.ok) {
        setLoadError(data.errors?.[0] ?? "순서 저장에 실패했습니다.");
        return;
      }
      setImages(data.images as ComplexImage[]);
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
      {loadError && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {loadError}
        </p>
      )}

      <div className="rounded-xl border border-navy-900/10 p-6 sm:p-8">
        <p className="text-sm font-semibold text-navy-900">새 사진 업로드</p>
        <p className="mt-1 text-xs text-navy-800/50">
          여러 파일을 한 번에 선택할 수 있습니다. 선택 시 아래 기본 분류가
          자동으로 채워지니, 파일마다 필요하면 직접 바꿔주세요.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="text-xs font-semibold text-navy-800/60">
            기본 분류
          </label>
          <select
            value={defaultCategory}
            onChange={(event) =>
              setDefaultCategory(event.target.value as ComplexImageCategory)
            }
            className="rounded-md border border-navy-900/15 bg-white px-2 py-1 text-xs text-navy-900 outline-none focus:border-gold-500"
          >
            {COMPLEX_IMAGE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {COMPLEX_IMAGE_CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
        </div>

        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => handleFilesSelected(event.target.files)}
          className="mt-3 text-sm"
        />

        {pendingFiles.length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {pendingFiles.map((item) => (
              <div
                key={item.key}
                className="flex items-center gap-3 rounded-md border border-navy-900/10 p-3"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.previewUrl}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-md object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-navy-800/50">{item.file.name}</p>
                  <select
                    value={item.category}
                    onChange={(event) =>
                      updatePendingCategory(
                        item.key,
                        event.target.value as ComplexImageCategory,
                      )
                    }
                    className="mt-1 w-full rounded-md border border-navy-900/15 bg-white px-2 py-1.5 text-xs text-navy-900 outline-none focus:border-gold-500"
                  >
                    {COMPLEX_IMAGE_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {COMPLEX_IMAGE_CATEGORY_LABELS[category]}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => removePendingFile(item.key)}
                  className="shrink-0 text-xs font-semibold text-red-600 hover:underline"
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

      <div className="mt-8">
        <h3 className="text-sm font-bold text-navy-950">등록된 단지 공통 사진</h3>
        {reordering && (
          <p className="mt-2 text-xs text-navy-800/50">순서 저장 중...</p>
        )}

        {images === null && (
          <p className="mt-4 text-sm text-navy-800/50">불러오는 중...</p>
        )}
        {images !== null && images.length === 0 && (
          <p className="mt-4 rounded-xl border border-navy-900/10 px-6 py-12 text-center text-sm text-navy-800/50">
            등록된 단지 공통 사진이 없습니다.
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
                  alt={COMPLEX_IMAGE_CATEGORY_LABELS[image.category]}
                  className="aspect-[4/3] w-full rounded-md object-cover"
                />
                <select
                  value={image.category}
                  onChange={(event) =>
                    handleCategoryChange(
                      image.id,
                      event.target.value as ComplexImageCategory,
                    )
                  }
                  className="rounded-md border border-navy-900/15 bg-white px-2 py-1 text-xs text-navy-900 outline-none focus:border-gold-500"
                >
                  {COMPLEX_IMAGE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {COMPLEX_IMAGE_CATEGORY_LABELS[category]}
                    </option>
                  ))}
                </select>
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
                {rowErrors[image.id] && (
                  <p className="text-[10px] text-red-600">{rowErrors[image.id]}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
