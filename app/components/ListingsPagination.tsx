import Link from "next/link";
import { getPageNumbersToShow } from "../lib/listingPagination";

const PAGE_LINK_BASE =
  "flex min-h-11 min-w-11 items-center justify-center rounded-md px-2 text-sm font-semibold transition-colors";

/**
 * /listings 하단 페이지 이동 UI. 서버 컴포넌트라 JS 없이도 동작합니다(그냥
 * <Link> 앵커라 크롤러도 그대로 따라갈 수 있음) — 뒤로가기 시 보던 페이지가
 * 그대로 열리는 것도 이 페이지가 진짜 URL 이동이기 때문입니다.
 */
export default function ListingsPagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  buildHref,
}: {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalCount);
  const pageNumbers = getPageNumbersToShow(currentPage, totalPages);

  return (
    <nav aria-label="매물 목록 페이지" className="mt-12 flex flex-col items-center gap-3">
      <p className="text-xs text-navy-800/50">
        총 {totalCount.toLocaleString()}건 중 {startIndex}~{endIndex}번째 · {currentPage}/
        {totalPages}페이지
      </p>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {currentPage > 1 ? (
          <Link
            href={buildHref(currentPage - 1)}
            aria-label="이전 페이지"
            className={`${PAGE_LINK_BASE} border border-navy-900/15 text-navy-800 hover:border-gold-500 hover:text-gold-600`}
          >
            이전
          </Link>
        ) : (
          <span className={`${PAGE_LINK_BASE} border border-navy-900/5 text-navy-800/25`}>
            이전
          </span>
        )}

        {pageNumbers.map((page, index) =>
          page === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className={`${PAGE_LINK_BASE} text-navy-800/30`}>
              …
            </span>
          ) : (
            <Link
              key={page}
              href={buildHref(page)}
              aria-current={page === currentPage ? "page" : undefined}
              className={
                page === currentPage
                  ? `${PAGE_LINK_BASE} bg-navy-950 text-gold-400`
                  : `${PAGE_LINK_BASE} border border-navy-900/15 text-navy-800 hover:border-gold-500 hover:text-gold-600`
              }
            >
              {page}
            </Link>
          ),
        )}

        {currentPage < totalPages ? (
          <Link
            href={buildHref(currentPage + 1)}
            aria-label="다음 페이지"
            className={`${PAGE_LINK_BASE} border border-navy-900/15 text-navy-800 hover:border-gold-500 hover:text-gold-600`}
          >
            다음
          </Link>
        ) : (
          <span className={`${PAGE_LINK_BASE} border border-navy-900/5 text-navy-800/25`}>
            다음
          </span>
        )}
      </div>
    </nav>
  );
}
