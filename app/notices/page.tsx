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
  const notices = await getPublishedNotices();

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
        {notices.length === 0 ? (
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
