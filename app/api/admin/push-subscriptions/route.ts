import { NextRequest, NextResponse } from "next/server";
import {
  deleteSubscriptionByEndpoint,
  saveSubscription,
} from "../../../lib/pushSubscriptions";

/** 알림 토글을 켤 때 호출합니다. 구독 정보는 PushSubscription.toJSON() 모양 그대로 보냅니다. */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { errors: ["요청 본문이 올바르지 않습니다."] },
      { status: 400 },
    );
  }

  const { endpoint, keys } = (body as { endpoint?: unknown; keys?: unknown }) ?? {};
  const { p256dh, auth } =
    (keys as { p256dh?: unknown; auth?: unknown } | undefined) ?? {};

  if (
    typeof endpoint !== "string" ||
    typeof p256dh !== "string" ||
    typeof auth !== "string"
  ) {
    return NextResponse.json(
      { errors: ["구독 정보가 올바르지 않습니다."] },
      { status: 400 },
    );
  }

  const userAgent = request.headers.get("user-agent") ?? undefined;
  const { subscription, error } = await saveSubscription(
    { endpoint, keys: { p256dh, auth } },
    userAgent,
  );

  if (!subscription) {
    return NextResponse.json(
      { errors: [error ?? "구독 저장에 실패했습니다."] },
      { status: 400 },
    );
  }

  return NextResponse.json({ subscription });
}

/** 알림 토글을 끌 때 호출합니다. */
export async function DELETE(request: NextRequest) {
  const endpoint = request.nextUrl.searchParams.get("endpoint");

  if (!endpoint) {
    return NextResponse.json(
      { errors: ["endpoint가 올바르지 않습니다."] },
      { status: 400 },
    );
  }

  const { error } = await deleteSubscriptionByEndpoint(endpoint);

  if (error) {
    return NextResponse.json({ errors: [error] }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
