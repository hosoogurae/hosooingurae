"use client";

import { useEffect, useState } from "react";

export interface ListingPhoto {
  id: string;
  listingId: string;
  url: string;
  sortOrder: number;
}

interface PendingPhoto {
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

/** 서버가 보내준 Supabase 원본 에러(code/message/details/hint)를 그대로 붙여 보여줍니다. */
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
 * 매물 사진 관리 UI. 두 가지 모드로 동작합니다:
 * - listingId가 있으면(이미 저장된 매물, /admin/listings/[id]/edit): 업로드·삭제·순서변경이
 *   즉시 서버에 반영됩니다(평면도 관리와 동일 — 이 화면의 "저장하기" 버튼과는 무관하게 동작).
 *   변경될 때마다 onPhotosChange로 현재 URL 목록을 부모에 알려서, 부모가 draft.images를
 *   최신 상태로 맞춰두게 합니다(그래야 나중에 "저장하기"를 눌러도 방금 올린 사진이
 *   지워지지 않습니다).
 * - listingId가 없으면(신규 등록 중, 아직 매물 ID가 없음): 로컬에만 파일을 쌓아두고
 *   실제 업로드는 하지 않습니다. onPendingFilesChange로 현재 선택된 파일 목록을
 *   부모에 알려서, 매물 저장이 성공한 뒤 부모가 그 파일들을 순서대로 업로드합니다.
 */
export default function ListingPhotoManager({
  listingId,
  onPhotosChange,
  onPendingFilesChange,
}: {
  listingId?: string;
  onPhotosChange?: (photos: ListingPhoto[]) => void;
  onPendingFilesChange?: (files: File[]) => void;
}) {
  const isLive = Boolean(listingId);

  const [photos, setPhotos] = useState<ListingPhoto[] | null>(null);
  const [pending, setPending] = useState<PendingPhoto[]>([]);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<string[] | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  useEffect(() => {
    if (!isLive || !listingId) return;
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/admin/listings/${listingId}/photos`);
        const data = await response.json();
        if (cancelled) return;
        if (!response.ok) {
          throw new Error(data.errors?.[0] ?? "사진 목록을 불러오지 못했습니다.");
        }
        const loaded = data.photos as ListingPhoto[];
        setPhotos(loaded);
        onPhotosChange?.(loaded);
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
          );
        }
      }
    }
    load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive, listingId]);

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    if (isLive) {
      uploadFilesLive(files);
      return;
    }

    const next: PendingPhoto[] = files.map((file) => ({
      key: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setPending((prev) => {
      const updated = [...prev, ...next];
      onPendingFilesChange?.(updated.map((item) => item.file));
      return updated;
    });
  }

  async function uploadFilesLive(files: File[]) {
    if (!listingId) return;
    setUploading(true);
    setErrors(null);
    const failed: string[] = [];

    for (const file of files) {
      const form = new FormData();
      form.append("file", file);
      try {
        const response = await fetch(`/api/admin/listings/${listingId}/photos`, {
          method: "POST",
          body: form,
        });
        const data = await response.json();
        if (!response.ok) {
          failed.push(
            `${file.name}: ${data.errors?.[0] ?? "업로드 실패"}${formatErrorDetail(
              data.errorDetail,
            )}`,
          );
          continue;
        }
        setPhotos((prev) => {
          const updated = [...(prev ?? []), data.photo as ListingPhoto];
          onPhotosChange?.(updated);
          return updated;
        });
      } catch {
        failed.push(`${file.name}: 네트워크 오류`);
      }
    }

    setUploading(false);
    if (failed.length > 0) setErrors(failed);
  }

  function removePending(key: string) {
    setPending((prev) => {
      const target = prev.find((item) => item.key === key);
      if (target) URL.revokeObjectURL(target.previewUrl);
      const updated = prev.filter((item) => item.key !== key);
      onPendingFilesChange?.(updated.map((item) => item.file));
      return updated;
    });
  }

  async function persistOrder(next: ListingPhoto[]) {
    if (!listingId) return;
    setReordering(true);
    setErrors(null);
    try {
      const response = await fetch(
        `/api/admin/listings/${listingId}/photos/reorder`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds: next.map((p) => p.id) }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        setErrors([data.errors?.[0] ?? "순서 저장에 실패했습니다."]);
        return;
      }
      const saved = data.photos as ListingPhoto[];
      setPhotos(saved);
      onPhotosChange?.(saved);
    } catch {
      setErrors(["네트워크 오류가 발생했습니다."]);
    } finally {
      setReordering(false);
    }
  }

  function movePhoto(index: number, direction: -1 | 1) {
    if (isLive) {
      const current = photos ?? [];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= current.length) return;
      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      setPhotos(next);
      persistOrder(next);
      return;
    }

    setPending((prev) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      onPendingFilesChange?.(next.map((item) => item.file));
      return next;
    });
  }

  function setPrimary(index: number) {
    if (index === 0) return;

    if (isLive) {
      const current = photos ?? [];
      const next = [
        current[index],
        ...current.slice(0, index),
        ...current.slice(index + 1),
      ];
      setPhotos(next);
      persistOrder(next);
      return;
    }

    setPending((prev) => {
      const next = [prev[index], ...prev.slice(0, index), ...prev.slice(index + 1)];
      onPendingFilesChange?.(next.map((item) => item.file));
      return next;
    });
  }

  async function deleteLive(photoId: string) {
    if (!listingId) return;
    if (!confirm("이 사진을 삭제할까요? 되돌릴 수 없습니다.")) return;
    setDeletingId(photoId);
    setErrors(null);
    try {
      const response = await fetch(
        `/api/admin/listings/${listingId}/photos/${photoId}`,
        { method: "DELETE" },
      );
      const data = await response.json();
      if (!response.ok) {
        setErrors([data.errors?.[0] ?? "삭제에 실패했습니다."]);
        return;
      }
      setPhotos((prev) => {
        const updated = (prev ?? []).filter((p) => p.id !== photoId);
        onPhotosChange?.(updated);
        return updated;
      });
    } catch {
      setErrors(["네트워크 오류가 발생했습니다."]);
    } finally {
      setDeletingId(null);
    }
  }

  const displayItems = isLive
    ? (photos ?? []).map((p) => ({ key: p.id, url: p.url, refId: p.id }))
    : pending.map((p) => ({ key: p.key, url: p.previewUrl, refId: p.key }));

  return (
    <div>
      <p className="text-xs text-navy-800/50">
        {isLive
          ? "사진은 저장 버튼과 별개로 즉시 반영됩니다."
          : "선택한 사진은 매물을 저장할 때 함께 업로드됩니다."}
      </p>

      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(event) => handleFilesSelected(event.target.files)}
        className="mt-2 text-sm"
      />

      {loadError && (
        <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {loadError}
        </p>
      )}
      {errors && (
        <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          <ul className="list-disc space-y-0.5 pl-4">
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}
      {(uploading || reordering) && (
        <p className="mt-2 text-xs text-navy-800/50">
          {uploading ? "업로드 중..." : "순서 저장 중..."}
        </p>
      )}

      {displayItems.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {displayItems.map((item, index) => (
            <div
              key={item.key}
              className="relative flex flex-col gap-1.5 rounded-md border border-navy-900/10 p-2"
            >
              {index === 0 && (
                <span className="absolute left-3 top-3 rounded-full bg-gold-500/90 px-2 py-0.5 text-[10px] font-bold text-navy-950">
                  대표사진
                </span>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt="매물 사진"
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
                    disabled={index === displayItems.length - 1}
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
                  onClick={() =>
                    isLive ? deleteLive(item.refId) : removePending(item.refId)
                  }
                  disabled={isLive && deletingId === item.refId}
                  className="font-semibold text-red-600 hover:underline disabled:opacity-50"
                >
                  {isLive && deletingId === item.refId ? "삭제 중..." : "삭제"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
