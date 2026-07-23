import { NextResponse } from "next/server";
import { getAllComplexes } from "../../../lib/complexes";

/** 단지 정보 관리 화면(/admin/complexes) 전용. 편집에 필요한 전체 필드를 내려줍니다. */
export async function GET() {
  const complexes = await getAllComplexes();
  return NextResponse.json({ complexes });
}
