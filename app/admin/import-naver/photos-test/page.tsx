"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/** 북마클릿(app/lib/naverPhotosBookmarklet.ts)이 이 origin에서만 실행된다고 가정합니다. */
const EXPECTED_ORIGIN = "https://new.land.naver.com";

interface ReceivedPhotos {
  pageUrl: string;
  urls: string[];
}

/**
 * 1차 프로토타입 전용 화면입니다. 북마클릿이 postMessage로 보낸 이미지 URL
 * 목록을 받아 개수와 썸네일만 보여줍니다. 저장/DB/출처선택/공개는 아직
 * 구현하지 않았습니다 — "북마클릿으로 이미지 URL을 무사히 넘겨받을 수
 * 있는가"만 확인하는 화면입니다.
 */
export default function NaverPhotosTestPage() {
  const [received, setReceived] = useState<ReceivedPhotos | null>(null);
  const [rejectedOrigin, setRejectedOrigin] = useState<string | null>(null);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== EXPECTED_ORIGIN) {
        setRejectedOrigin(event.origin);
        return;
      }

      const data = event.data as unknown;
      if (
        !data ||
        typeof data !== "object" ||
        (data as { type?: unknown }).type !== "hosoo-import-photos"
      ) {
        return;
      }

      const payload = data as { pageUrl?: unknown; urls?: unknown };
      const urls = Array.isArray(payload.urls)
        ? payload.urls.filter((url): url is string => typeof url === "string")
        : [];

      setReceived({
        pageUrl: typeof payload.pageUrl === "string" ? payload.pageUrl : "",
        urls,
      });

      if (event.source && "postMessage" in event.source) {
        (event.source as Window).postMessage("hosoo-import-ack", event.origin);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold tracking-wide text-gold-600">
          ADMIN · 프로토타입
        </p>
        <Link
          href="/admin/import-naver"
          className="text-sm font-medium text-navy-800/60 underline-offset-4 hover:text-gold-600 hover:underline"
        >
          ← 네이버 매물 가져오기
        </Link>
      </div>
      <h1 className="mt-2 text-2xl font-black text-navy-950 sm:text-3xl">
        네이버 사진 가져오기 (북마클릿 테스트)
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-navy-800/70">
        1차 프로토타입 화면입니다. 북마클릿으로 넘어온 이미지 URL 개수와
        썸네일만 보여줍니다 — 저장, 출처 선택, 공개 전환 기능은 아직 없습니다.
      </p>

      {!received && (
        <div className="mt-8 rounded-xl border border-dashed border-navy-900/20 p-8 text-center text-sm text-navy-800/50">
          네이버 매물 페이지에서 북마클릿을 클릭하면 이 화면으로 이미지 목록이
          전달됩니다. 이 탭을 열어둔 채로 기다려주세요.
          {rejectedOrigin && (
            <p className="mt-3 text-red-600">
              예상하지 못한 출처({rejectedOrigin})에서 메시지를 받아
              무시했습니다. 네이버 매물 페이지가 맞는지 확인해주세요.
            </p>
          )}
        </div>
      )}

      {received && (
        <div className="mt-8">
          <div className="rounded-md border border-gold-500/30 bg-gold-500/10 px-4 py-3 text-sm text-navy-900">
            <p className="font-semibold">
              총 {received.urls.length}개 이미지를 전달받았습니다.
            </p>
            {received.pageUrl && (
              <p className="mt-1 break-all text-xs text-navy-800/60">
                원본 페이지: {received.pageUrl}
              </p>
            )}
          </div>

          {received.urls.length > 0 ? (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {received.urls.map((url) => (
                <div
                  key={url}
                  className="overflow-hidden rounded-lg border border-navy-900/10"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt="네이버 매물 사진 후보"
                    className="aspect-square w-full object-cover"
                  />
                  <p className="truncate p-1.5 text-[10px] text-navy-800/40">
                    {url}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-sm text-navy-800/50">
              전달된 이미지가 0개입니다. landthumb-phinf.pstatic.net 이미지가
              없는 페이지였을 수 있습니다.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
