"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface UploadResult {
  fileName: string;
  success: boolean;
  error?: string;
}

export default function SellPhotosPage() {
  const params = useParams<{ id: string }>();
  const submissionId = params.id;

  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<UploadResult[] | null>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFiles(Array.from(event.target.files ?? []));
    setResults(null);
  }

  async function handleUpload() {
    if (files.length === 0) return;

    setUploading(true);
    setProgress({ done: 0, total: files.length });
    const collected: UploadResult[] = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append("files", file);

      try {
        const response = await fetch(
          `/api/listing-submissions/${submissionId}/photos`,
          { method: "POST", body: formData },
        );
        const data = await response.json();

        if (response.ok && Array.isArray(data.results)) {
          collected.push(...(data.results as UploadResult[]));
        } else {
          collected.push({
            fileName: file.name,
            success: false,
            error: data.error ?? "업로드에 실패했습니다.",
          });
        }
      } catch {
        collected.push({
          fileName: file.name,
          success: false,
          error: "네트워크 오류로 업로드에 실패했습니다.",
        });
      }

      setProgress((prev) => ({ ...prev, done: prev.done + 1 }));
    }

    setResults(collected);
    setUploading(false);
  }

  const succeededCount = results?.filter((result) => result.success).length ?? 0;
  const failed = results?.filter((result) => !result.success) ?? [];

  return (
    <div className="mx-auto max-w-xl px-6 py-16 text-center">
      <p className="text-sm font-semibold text-gold-600">매물 사진 등록</p>
      <h1 className="mt-2 text-2xl font-black text-navy-950 sm:text-3xl">
        집 사진을 올려주세요
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-navy-800/70">
        여러 장을 한 번에 선택할 수 있어요. 사진은 선택사항이며, 나중에 다시
        올리셔도 괜찮습니다.
      </p>

      {!results ? (
        <div className="mt-8 rounded-xl border border-navy-900/10 p-6 sm:p-8">
          <label className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-navy-900/15 px-6 py-10 transition-colors hover:border-gold-500">
            <span className="text-sm font-bold text-navy-900">
              {files.length > 0
                ? `${files.length}장 선택됨`
                : "탭해서 사진 선택하기"}
            </span>
            <span className="text-xs text-navy-800/50">
              카메라로 바로 찍거나, 사진첩에서 선택할 수 있어요
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {files.length > 0 && (
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              className="mt-6 w-full rounded-md bg-gradient-to-r from-gold-500 to-gold-600 px-6 py-3 text-sm font-bold text-navy-950 shadow-md shadow-gold-500/30 transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {uploading
                ? `업로드 중... (${progress.done}/${progress.total})`
                : `${files.length}장 업로드하기`}
            </button>
          )}

          <p className="mt-6 text-xs text-navy-800/40">
            <Link href="/" className="underline-offset-4 hover:underline">
              사진 없이 나중에 하기 →
            </Link>
          </p>
        </div>
      ) : (
        <div className="mt-8 rounded-xl border border-navy-900/10 p-6 sm:p-8">
          {succeededCount > 0 ? (
            <p className="text-base font-bold text-navy-950">
              사진이 등록되었습니다. ({succeededCount}장)
            </p>
          ) : (
            <p className="text-base font-bold text-navy-950">
              사진 업로드에 실패했습니다.
            </p>
          )}
          <p className="mt-2 text-sm text-navy-800/60">
            매물 접수는 이미 완료되어 있으니 걱정하지 않으셔도 됩니다.
          </p>

          {failed.length > 0 && (
            <ul className="mt-4 list-disc space-y-0.5 pl-4 text-left text-xs text-red-600">
              {failed.map((result) => (
                <li key={result.fileName}>
                  {result.fileName}: {result.error}
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/"
            className="mt-6 inline-block rounded-md bg-gradient-to-r from-gold-500 to-gold-600 px-6 py-2.5 text-sm font-bold text-navy-950 shadow-md shadow-gold-500/30"
          >
            홈으로 돌아가기
          </Link>
        </div>
      )}
    </div>
  );
}
