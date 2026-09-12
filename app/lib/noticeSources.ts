import { XMLParser } from "fast-xml-parser";

/**
 * "지역 소식" 자동 수집(1단계) 전용. 두 출처(국토부 보도자료 RSS, 김포시
 * 고시공고 목록)에서 제목·원문 링크·게시일만 가져옵니다 — 본문은 남의
 * 저작물이라 절대 가져오지 않습니다(description/본문 필드 자체를 안 씀).
 *
 * 파싱 함수(parseMolitRss/parseGimpoNoticeList)는 순수 함수입니다.
 * 네트워크 호출은 fetchMolitNotices/fetchGimpoNotices가 담당하고, 실패는
 * 서로에게 전파되지 않습니다(한쪽이 실패해도 다른 쪽은 계속 진행).
 *
 * 중요: 파싱된 항목이 0건이면 "성공"으로 취급하지 않고 error를 채웁니다.
 * 두 출처 모두 매일 새 글이 있는 게 정상이라, 0건은 거의 항상 원본
 * 사이트 구조가 바뀌어 파싱이 깨졌다는 신호입니다(예외를 던지지 않고
 * 조용히 빈 배열만 돌려주면, 몇 주 동안 아무것도 안 쌓이는 걸 아무도
 * 눈치채지 못합니다).
 */

export type NoticeSource = "molit" | "gimpo";

export interface ParsedNotice {
  source: NoticeSource;
  title: string;
  sourceUrl: string;
  /** ISO 8601 문자열. */
  publishedAt: string;
}

export interface NoticeParseResult {
  notices: ParsedNotice[];
  error?: string;
}

export interface NoticeFetchResult {
  source: NoticeSource;
  notices: ParsedNotice[];
  error?: string;
}

const MOLIT_RSS_URL = "https://www.molit.go.kr/dev/board/board_rss.jsp?rss_id=NEWS";
const GIMPO_LIST_URL =
  "https://www.gimpo.go.kr/portal/ntfcPblancList.do?key=1004&cate_cd=1&searchCnd=40900000000";
const GIMPO_BASE_URL = "https://www.gimpo.go.kr/portal/";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

// link 필드가 CDATA 없이 &#38;(숫자 문자참조) 형태로 들어와 있어서
// htmlEntities 옵션 없이는 "&"로 안 풀립니다(직접 확인함).
const xmlParser = new XMLParser({ ignoreAttributes: true, htmlEntities: true });

/**
 * 국토부 보도자료 RSS(XML)를 파싱합니다. description(본문 iframe 임베드)은
 * 저장 대상이 아니라서 아예 읽지 않습니다.
 */
export function parseMolitRss(xml: string): NoticeParseResult {
  let parsed: unknown;
  try {
    parsed = xmlParser.parse(xml);
  } catch (err) {
    return {
      notices: [],
      error: `국토부 RSS를 해석하지 못했습니다: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const channel = (parsed as { rss?: { channel?: { item?: unknown } } })?.rss?.channel;
  if (!channel) {
    return {
      notices: [],
      error:
        "국토부 RSS 구조가 예상과 다릅니다(channel을 찾을 수 없음) — 원본 사이트 구조가 바뀌었을 수 있습니다.",
    };
  }

  const rawItems = channel.item;
  const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

  const notices: ParsedNotice[] = [];
  for (const item of items) {
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;

    const title = typeof record.title === "string" ? record.title.trim() : "";
    const link = typeof record.link === "string" ? record.link.trim() : "";
    const pubDate = typeof record.pubDate === "string" ? record.pubDate : undefined;
    if (!title || !link || !pubDate) continue;

    const publishedAt = new Date(pubDate);
    if (Number.isNaN(publishedAt.getTime())) continue;

    notices.push({ source: "molit", title, sourceUrl: link, publishedAt: publishedAt.toISOString() });
  }

  if (notices.length === 0) {
    return {
      notices: [],
      error:
        "국토부 RSS에서 파싱된 항목이 0건입니다. 원본 사이트 구조가 바뀌었을 수 있습니다.",
    };
  }

  return { notices };
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * 김포시 고시공고 목록(HTML)을 파싱합니다. 이 프로젝트엔 HTML 파서
 * 라이브러리가 없고, 표 구조가 아주 규칙적이라(항상 tr당 td 5개, 제목
 * 링크는 3번째 td의 유일한 a, 등록일은 항상 마지막 td) 정규식으로
 * 파싱합니다 — 새 의존성을 추가하지 않습니다. 표 구조가 바뀌면 실패가
 * error로 드러납니다(아래 0건 처리 참고).
 */
export function parseGimpoNoticeList(html: string): NoticeParseResult {
  const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
  if (!tbodyMatch) {
    return {
      notices: [],
      error:
        "김포시 고시공고 표 구조를 찾을 수 없습니다(tbody 없음) — 원본 페이지 구조가 바뀌었을 수 있습니다.",
    };
  }

  const rowMatches = tbodyMatch[1].match(/<tr>[\s\S]*?<\/tr>/g) ?? [];
  const notices: ParsedNotice[] = [];

  for (const row of rowMatches) {
    const linkMatch = row.match(/<a\s+href="([^"]+)"[^>]*>([^<]*)<\/a>/);
    if (!linkMatch) continue;

    const cellMatches = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)];
    if (cellMatches.length === 0) continue;

    const title = decodeHtmlEntities(linkMatch[2]).trim();
    const href = decodeHtmlEntities(linkMatch[1]).trim();
    // 등록일은 항상 그 행의 마지막 td입니다(번호/고시공고번호/제목/담당부서/등록일 순).
    const lastCellText = decodeHtmlEntities(cellMatches[cellMatches.length - 1][1]).trim();
    if (!title || !href) continue;

    // "YYYY-MM-DD" 형식만 다룹니다(시간 정보가 없어 KST 자정으로 저장).
    if (!/^\d{4}-\d{2}-\d{2}$/.test(lastCellText)) continue;
    const publishedAt = new Date(`${lastCellText}T00:00:00+09:00`);
    if (Number.isNaN(publishedAt.getTime())) continue;

    let sourceUrl: string;
    try {
      sourceUrl = new URL(href, GIMPO_BASE_URL).toString();
    } catch {
      continue;
    }

    notices.push({ source: "gimpo", title, sourceUrl, publishedAt: publishedAt.toISOString() });
  }

  if (notices.length === 0) {
    return {
      notices: [],
      error:
        "김포시 고시공고 목록에서 파싱된 항목이 0건입니다. 원본 페이지 구조가 바뀌었을 수 있습니다.",
    };
  }

  return { notices };
}

/**
 * 국토부 사이트는 봇 차단용 쿠키 챌린지가 있습니다 — 첫 요청은 항상
 * 307 + Set-Cookie를 주고, 그 쿠키를 그대로 돌려보내야 다음 요청이
 * 200을 줍니다. fetch()는 브라우저와 달리 쿠키를 자동으로 기억하지
 * 않아서(직접 재현해서 확인함 — "redirect count exceeded"로 실패),
 * redirect:"manual"로 직접 따라가며 쿠키를 수동으로 되돌려줍니다.
 */
async function fetchWithRedirectCookie(url: string, maxRedirects = 10): Promise<string> {
  let currentUrl = url;
  let cookie: string | undefined;

  for (let attempt = 0; attempt < maxRedirects; attempt++) {
    const response = await fetch(currentUrl, {
      redirect: "manual",
      headers: {
        "User-Agent": USER_AGENT,
        ...(cookie ? { Cookie: cookie } : {}),
      },
    });

    const setCookie = response.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new Error(`리다이렉트 응답(${response.status})에 location 헤더가 없습니다.`);
      }
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  }

  throw new Error(`리다이렉트를 ${maxRedirects}회 넘게 따라갔지만 끝나지 않았습니다.`);
}

export async function fetchMolitNotices(): Promise<NoticeFetchResult> {
  try {
    const xml = await fetchWithRedirectCookie(MOLIT_RSS_URL);
    const { notices, error } = parseMolitRss(xml);
    return { source: "molit", notices, error };
  } catch (err) {
    return {
      source: "molit",
      notices: [],
      error: `국토부 RSS를 가져오지 못했습니다: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function fetchGimpoNotices(): Promise<NoticeFetchResult> {
  try {
    const response = await fetch(GIMPO_LIST_URL, { headers: { "User-Agent": USER_AGENT } });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const html = await response.text();
    const { notices, error } = parseGimpoNoticeList(html);
    return { source: "gimpo", notices, error };
  } catch (err) {
    return {
      source: "gimpo",
      notices: [],
      error: `김포시 고시공고 목록을 가져오지 못했습니다: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/** 두 출처를 각각 독립적으로 가져옵니다 — 한쪽이 실패해도 다른 쪽 결과에는 영향이 없습니다. */
export async function fetchAllNotices(): Promise<NoticeFetchResult[]> {
  return Promise.all([fetchMolitNotices(), fetchGimpoNotices()]);
}
