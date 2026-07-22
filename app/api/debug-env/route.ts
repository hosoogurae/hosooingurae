import { NextResponse } from "next/server";

/** 임시 진단용 — 프로덕션에 실제로 이 환경변수가 어떻게 보이는지 마스킹해서 확인합니다. */
export async function GET() {
  const raw = process.env.NEXT_PUBLIC_INQUIRY_MOBILE;
  const masked =
    raw && raw.length > 4
      ? `${raw.slice(0, 3)}${"*".repeat(Math.max(0, raw.length - 7))}${raw.slice(-4)}`
      : raw;

  return NextResponse.json({
    hasValue: raw !== undefined,
    typeofValue: typeof raw,
    length: raw?.length ?? null,
    masked: masked ?? null,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
  });
}
