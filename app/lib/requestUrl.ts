import { headers } from "next/headers";

/**
 * 이 파일의 origin은 "지금 접속한 주소"이고, process.env.NEXT_PUBLIC_SITE_URL은
 * "검색엔진에 알려주는 단 하나의 공식 주소"입니다 — 서로 다른 용도라 섞으면
 * 안 됩니다. 문의 메시지·비교하기 링크·광고문구처럼 사용자가 지금 보고 있는
 * 도메인 그대로를 반영해야 하는 곳(미리보기 배포 등 포함)에는 이 파일을,
 * canonical·sitemap·robots·OG 태그처럼 도메인이 여러 개(apex/www/vercel.app
 * 미리보기)로 열려도 "이게 진짜 주소"라고 한 곳만 가리켜야 하는 곳에는
 * NEXT_PUBLIC_SITE_URL을 쓰세요.
 *
 * 현재 요청의 host 헤더로 절대 URL의 origin(프로토콜+호스트)을 만듭니다.
 * localhost는 http, 그 외(배포 환경)는 https로 간주합니다. host 헤더가
 * 없으면(드묾) undefined를 돌려줘 호출부가 링크 영역을 생략할 수 있게 합니다.
 */
export async function getRequestOrigin(): Promise<string | undefined> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  if (!host) return undefined;
  const protocol = host.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

/** getRequestOrigin() + 경로를 합친 절대 URL. origin을 못 구하면 undefined. */
export async function buildAbsoluteUrl(path: string): Promise<string | undefined> {
  const origin = await getRequestOrigin();
  return origin ? `${origin}${path}` : undefined;
}
