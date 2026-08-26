import { headers } from "next/headers";

/**
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
