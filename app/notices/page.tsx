import type { Metadata } from "next";
import { getPublishedNotices } from "../lib/publicNotices";

export const metadata: Metadata = {
  title: "부동산 정보 | 호수공인중개사사무소",
  description:
    "김포시 고시공고와 국토교통부 보도자료 중 부동산 관련 소식을 모아 전해드립니다.",
  alternates: { canonical: "/notices" },
};

const SOURCE_LABELS: Record<string, string> = {
  molit: "국토부",
  gimpo: "김포시",
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

export default async function NoticesPage() {
  let notices: Awaited<ReturnType<typeof getPublishedNotices>> = [];
  let loadFailed = false;
  try {
    notices = await getPublishedNotices();
  } catch (error) {
    // 실제로 0건인 것과 못 가져온 것을 구분합니다 — 여기서 조용히 빈
    // 배열로 넘기면 "소식이 없다"는 거짓 안내가 됩니다.
    console.error("[NoticesPage] 소식 조회 실패", error);
    loadFailed = true;
  }

  return (
    <>
      <section className="bg-navy-950 px-6 py-16 text-center">
        <p className="mb-3 text-sm font-semibold tracking-wide text-gold-400">NOTICES</p>
        <h1 className="text-3xl font-black text-white sm:text-4xl">부동산 정보</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/70">
          김포시 고시공고와 국토교통부 보도자료 중 부동산 관련 소식을 모아
          전해드립니다.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16">
        {loadFailed ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            <p>소식을 일시적으로 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>
            <a
              href="/notices"
              className="mt-2 inline-block font-bold underline underline-offset-2"
            >
              다시 시도
            </a>
          </div>
        ) : notices.length === 0 ? (
          <p className="rounded-xl border border-navy-900/10 px-6 py-16 text-center text-sm text-navy-800/50">
            아직 올라온 소식이 없습니다.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {notices.map((notice) => (
              <li key={notice.sourceUrl}>
                <a
                  href={notice.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl border border-navy-900/10 p-4 transition-colors hover:border-gold-500"
                >
                  <p className="text-xs text-navy-800/50">
                    {formatDate(notice.publishedAt)} · {SOURCE_LABELS[notice.source] ?? notice.source}
                  </p>
                  <p className="mt-2 text-base font-bold leading-snug text-navy-950">
                    {notice.title}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
