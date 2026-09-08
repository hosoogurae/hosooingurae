"use client";

import { useSyncExternalStore } from "react";
import { Contact } from "lucide-react";
import { formatPhoneNumber } from "../lib/phoneNormalize";

/**
 * Contact Picker API는 아직 표준 lib.dom.d.ts에 없어(안드로이드 크롬 전용,
 * W3C 초안 단계) 여기서만 쓰는 최소한의 타입을 직접 선언합니다. 실제로
 * 요청하는 항목은 "name"·"tel" 둘뿐입니다(이메일·주소·사진 등은 요청하지
 * 않음).
 */
interface PickedContact {
  name?: string[];
  tel?: string[];
}
interface ContactsManager {
  select(
    properties: Array<"name" | "tel">,
    options?: { multiple?: boolean },
  ): Promise<PickedContact[]>;
}
interface NavigatorWithContacts extends Navigator {
  contacts: ContactsManager;
}

/** 스펙 권장 방식대로 navigator.contacts와 window.ContactsManager 둘 다 확인합니다. */
function isContactPickerSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "contacts" in navigator &&
    typeof window !== "undefined" &&
    "ContactsManager" in window
  );
}

// 구독할 대상이 없는 정적 값이라 아무 것도 하지 않는 구독 함수를 씁니다.
// 서버에서는 지원 여부를 알 수 없으니 false(숨김)를 반환해 하이드레이션
// 불일치를 피하고, 마운트된 클라이언트에서만 실제 값을 읽습니다
// (ContactActions.tsx의 isMobileDevice와 동일한 패턴 — useEffect+setState
// 대신 useSyncExternalStore를 씁니다).
function subscribe() {
  return () => {};
}
function getServerSnapshot() {
  return false;
}

/**
 * "연락처에서 가져오기" 버튼. 안드로이드 크롬에서만 동작하는 기능이라
 * (아이폰·데스크톱 미지원) 지원 여부를 마운트 후 판정해서, 지원하지
 * 않으면 버튼 자체를 렌더링하지 않습니다 — 눌러도 아무 일 없는 버튼이
 * 제일 나쁘기 때문입니다. 지원 판정 전(SSR/최초 렌더)에도 렌더링하지
 * 않으므로 하이드레이션 불일치가 없습니다.
 */
export default function ContactPickerButton({
  onPick,
  className = "",
}: {
  /** 이름은 연락처에 없을 수 있어 undefined일 수 있습니다. 번호는 010-1234-5678 형태로 정규화되어 옵니다. */
  onPick: (contact: { name: string | undefined; phone: string }) => void;
  className?: string;
}) {
  const supported = useSyncExternalStore(subscribe, isContactPickerSupported, getServerSnapshot);

  if (!supported) return null;

  async function handleClick() {
    try {
      const [picked] = await (navigator as NavigatorWithContacts).contacts.select(
        ["name", "tel"],
        { multiple: false },
      );
      if (!picked) return; // 사용자가 선택 없이 닫음
      const rawPhone = picked.tel?.[0];
      if (!rawPhone) return;
      onPick({
        name: picked.name?.[0],
        phone: formatPhoneNumber(rawPhone),
      });
    } catch {
      // 권한 거부, 사용자 취소 등 — 조용히 무시합니다(직접 입력하면 됨).
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        className="min-h-[48px] w-full rounded-lg border border-navy-900/15 text-sm font-bold text-navy-800"
      >
        <span className="inline-flex items-center justify-center gap-1.5">
          <Contact className="h-4 w-4" strokeWidth={2} />
          연락처에서 가져오기
        </span>
      </button>
      <p className="mt-1 text-xs text-navy-800/50">
        선택한 한 명의 번호만 가져옵니다
      </p>
    </div>
  );
}
