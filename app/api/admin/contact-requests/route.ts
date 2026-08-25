import { NextResponse } from "next/server";
import { getAllContactRequests } from "../../../lib/contactRequests";

/** 관리자 문의함(/admin/contacts) 전용 조회 API입니다. */
export async function GET() {
  const contactRequests = await getAllContactRequests();
  return NextResponse.json({ contactRequests });
}
