"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { FloorPlanImage } from "../../data/floorPlans";
import type { ComplexOption } from "../../lib/naverImport";

const inputClass =
  "rounded-md border border-navy-900/15 bg-white px-3 py-2 text-sm text-navy-900 outline-none focus:border-gold-500";

interface PendingFile {
  key: string;
  file: File;
  unitType: string;
  previewUrl: string;
}

function stripExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? fileName.slice(0, dot) : fileName;
}

export default function AdminFloorPlansPage() {
  const [complexOptions, setComplexOptions] = useState<ComplexOption[]>([]);
  const [complexId, setComplexId] = useState("");
  const [images, setImages] = useState<FloorPlanImage[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[] | null>(null);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

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

  async function loadImages(targetComplexId: string) {
    if (!targetComplexId) {
      setImages([]);
      return;
    }
    setLoadError(null);
    try {
      const response = await fetch(
        `/api/admin/floor-plans?complexId=${encodeURIComponent(targetComplexId)}`,
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.errors?.[0] ?? "평면도 목록을 불러오지 못했습니다.");
      }
      setImages(data.images as FloorPlanImage[]);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
      );
      setImages([]);
    }
  }

  useEffect(() => {
    async function run() {
      if (complexId) {
        await loadImages(complexId);
      } else {
        setImages([]);
      }
    }
    run();
  }, [complexId]);

  const groupedImages = useMemo(() => {
    const groups = new Map<string, FloorPlanImage[]>();
    for (const image of images ?? []) {
      const list = groups.get(image.unitType) ?? [];
      list.push(image);
      groups.set(image.unitType, list);
    }
    return Array.from(groups.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
  }, [images]);

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const next: PendingFile[] = Array.from(fileList).map((file) => ({
      key: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      file,
      unitType: stripExtension(file.name),
      previewUrl: URL.createObjectURL(file),
    }));
    setPendingFiles((prev) => [...prev, ...next]);
  }

  function updatePendingUnitType(key: string, value: string) {
    setPendingFiles((prev) =>
      prev.map((item) => (item.key === key ? { ...item, unitType: value } : item)),
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
    const missingType = pendingFiles.find((item) => item.unitType.trim() === "");
    if (missingType) {
      setUploadErrors(["모든 파일에 타입명을 입력해주세요."]);
      return;
    }

    setUploading(true);
    setUploadErrors(null);
    const failed: string[] = [];

    for (const item of pendingFiles) {
      const form = new FormData();
      form.append("complexId", complexId);
      form.append("unitType", item.unitType.trim());
      form.append("file", item.file);

      try {
        const response = await fetch("/api/admin/floor-plans", {
          method: "POST",
          body: form,
        });
        const data = await response.json();
        if (!response.ok) {
          failed.push(`${item.file.name}: ${data.errors?.[0] ?? "업로드 실패"}`);
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
    if (failed.length > 0) {
      setUploadErrors(failed);
    }
    await loadImages(complexId);
  }

  async function handleRename(id: string) {
    if (renameValue.trim() === "") return;
    setRowErrors((prev) => ({ ...prev, [id]: "" }));
    try {
      const response = await fetch(`/api/admin/floor-plans/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitType: renameValue.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        setRowErrors((prev) => ({
          ...prev,
          [id]: data.errors?.[0] ?? "수정에 실패했습니다.",
        }));
        return;
      }
      setRenamingId(null);
      await loadImages(complexId);
    } catch {
      setRowErrors((prev) => ({ ...prev, [id]: "네트워크 오류가 발생했습니다." }));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("이 평면도 이미지를 삭제할까요? 되돌릴 수 없습니다.")) return;
    setDeletingId(id);
    try {
      const response = await fetch(`/api/admin/floor-plans/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        setRowErrors((prev) => ({
          ...prev,
          [id]: data.errors?.[0] ?? "삭제에 실패했습니다.",
        }));
        return;
      }
      await loadImages(complexId);
    } catch {
      setRowErrors((prev) => ({ ...prev, [id]: "네트워크 오류가 발생했습니다." }));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
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
        단지 평면도 관리
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-navy-800/70">
        단지 · 타입별로 평면도 이미지를 등록하면, 같은 단지·같은 타입(매물
        수정 화면의 &quot;평형 타입&quot;)의 매물 상세페이지에 자동으로
        노출됩니다.
      </p>

      <div className="mt-8 rounded-xl border border-navy-900/10 p-6 sm:p-8">
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

        {loadError && (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {loadError}
          </p>
        )}

        <div className="mt-6 border-t border-navy-900/10 pt-6">
          <p className="text-sm font-semibold text-navy-900">새 평면도 업로드</p>
          <p className="mt-1 text-xs text-navy-800/50">
            여러 파일을 한 번에 선택할 수 있습니다. 파일명이 타입명으로
            자동으로 채워지니, 필요하면 아래에서 직접 고쳐주세요(예: 84a →
            84A).
          </p>
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
                    <p className="truncate text-xs text-navy-800/50">
                      {item.file.name}
                    </p>
                    <input
                      value={item.unitType}
                      onChange={(event) =>
                        updatePendingUnitType(item.key, event.target.value)
                      }
                      placeholder="타입명 (예: 84A)"
                      className={`${inputClass} mt-1 w-full`}
                    />
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
              {uploading
                ? "업로드 중..."
                : `${pendingFiles.length}개 파일 일괄 업로드`}
            </button>
          )}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-bold text-navy-950">등록된 평면도</h2>

        {images === null && (
          <p className="mt-4 text-sm text-navy-800/50">불러오는 중...</p>
        )}
        {images !== null && groupedImages.length === 0 && (
          <p className="mt-4 rounded-xl border border-navy-900/10 px-6 py-12 text-center text-sm text-navy-800/50">
            등록된 평면도가 없습니다.
          </p>
        )}

        <div className="mt-4 flex flex-col gap-6">
          {groupedImages.map(([unitType, group]) => (
            <div
              key={unitType}
              className="rounded-xl border border-navy-900/10 p-5"
            >
              <p className="text-sm font-bold text-navy-950">{unitType}</p>
              <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                {group.map((image) => (
                  <div key={image.id} className="flex flex-col gap-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.url}
                      alt={unitType}
                      className="aspect-square w-full rounded-md border border-navy-900/10 object-cover"
                    />
                    {renamingId === image.id ? (
                      <div className="flex gap-1">
                        <input
                          value={renameValue}
                          onChange={(event) => setRenameValue(event.target.value)}
                          className={`${inputClass} w-full px-2 py-1 text-xs`}
                        />
                        <button
                          type="button"
                          onClick={() => handleRename(image.id)}
                          className="shrink-0 text-xs font-semibold text-gold-600"
                        >
                          저장
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-between gap-1 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingId(image.id);
                            setRenameValue(image.unitType);
                          }}
                          className="font-medium text-navy-800/60 hover:text-gold-600 hover:underline"
                        >
                          타입명 수정
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(image.id)}
                          disabled={deletingId === image.id}
                          className="font-medium text-red-600 hover:underline disabled:opacity-50"
                        >
                          {deletingId === image.id ? "삭제 중..." : "삭제"}
                        </button>
                      </div>
                    )}
                    {rowErrors[image.id] && (
                      <p className="text-[10px] text-red-600">
                        {rowErrors[image.id]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
