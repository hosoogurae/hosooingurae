import { useSyncExternalStore } from "react";
import { MAX_COMPARE_SELECTION } from "./compareConstants";

/**
 * "매물 비교" 선택 상태 — 서버/DB에 저장하지 않는 순수 클라이언트 상태입니다.
 * 확정된 비교는 /compare?ids=...의 URL 자체가 영속 저장소 역할을 하므로,
 * 선택 중(체크박스 단계)에만 필요한 이 상태는 localStorage에 두는 것으로
 * 충분합니다. TransactionPriceChart/InquirySmsButton과 같은
 * useSyncExternalStore 패턴을 그대로 따릅니다.
 *
 * 선택은 마지막으로 실제로 바뀐 시점(updatedAt) 기준 24시간이 지나면 만료되어
 * 빈 상태로 취급합니다. 단순 새로고침/페이지 이동은 updatedAt을 갱신하지
 * 않으며, toggle/remove/clear로 선택이 실제로 바뀔 때만 24시간이 다시
 * 연장됩니다.
 */

const STORAGE_KEY = "hosoo:compareSelection";
const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24시간

const EMPTY_SELECTION: string[] = [];

interface StoredSelection {
  ids: string[];
  updatedAt: number;
}

let selection: string[] = EMPTY_SELECTION;
let updatedAt = 0;
let initialized = false;
let expiryTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function clearStorage() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 저장 공간이 없는 환경(시크릿 모드 등)은 조용히 무시합니다.
  }
}

/**
 * 저장된 값이 옛 형식(타임스탬프 없는 배열)이거나, updatedAt이 없거나,
 * 24시간이 지났으면 오래된 데이터로 간주해 저장소를 지우고 빈 상태를
 * 돌려줍니다.
 */
function readFromStorage(): StoredSelection {
  if (typeof window === "undefined") return { ids: EMPTY_SELECTION, updatedAt: 0 };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ids: EMPTY_SELECTION, updatedAt: 0 };

    const parsed: unknown = JSON.parse(raw);
    const hasValidShape =
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed) &&
      Array.isArray((parsed as { ids?: unknown }).ids) &&
      typeof (parsed as { updatedAt?: unknown }).updatedAt === "number";

    if (!hasValidShape) {
      clearStorage();
      return { ids: EMPTY_SELECTION, updatedAt: 0 };
    }

    const { ids: rawIds, updatedAt: storedUpdatedAt } = parsed as StoredSelection;

    if (Date.now() - storedUpdatedAt >= EXPIRY_MS) {
      clearStorage();
      return { ids: EMPTY_SELECTION, updatedAt: 0 };
    }

    const ids = rawIds.filter((value): value is string => typeof value === "string");
    return { ids, updatedAt: storedUpdatedAt };
  } catch {
    clearStorage();
    return { ids: EMPTY_SELECTION, updatedAt: 0 };
  }
}

/**
 * 탭을 계속 켜놓은 경우에도 24시간이 지나면 자동으로 초기화되도록, 남은
 * 시간만큼 타이머를 예약합니다. 선택이 바뀔 때(persist)마다 다시 예약합니다.
 */
function scheduleExpiry() {
  if (typeof window === "undefined") return;
  if (expiryTimer !== null) {
    clearTimeout(expiryTimer);
    expiryTimer = null;
  }
  if (selection.length === 0) return;

  const remaining = updatedAt + EXPIRY_MS - Date.now();
  if (remaining <= 0) {
    selection = EMPTY_SELECTION;
    clearStorage();
    return;
  }
  expiryTimer = setTimeout(() => {
    selection = EMPTY_SELECTION;
    clearStorage();
    listeners.forEach((listener) => listener());
  }, remaining);
}

function ensureInitialized() {
  if (initialized || typeof window === "undefined") return;
  const stored = readFromStorage();
  selection = stored.ids;
  updatedAt = stored.updatedAt;
  initialized = true;
  scheduleExpiry();
}

function persist() {
  if (typeof window !== "undefined") {
    updatedAt = Date.now();
    try {
      if (selection.length === 0) {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        const payload: StoredSelection = { ids: selection, updatedAt };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      }
    } catch {
      // 저장 공간이 없는 환경(시크릿 모드 등)은 조용히 무시합니다. 이번 탭
      // 안에서는 메모리 상태로 계속 동작합니다.
    }
    scheduleExpiry();
  }
  listeners.forEach((listener) => listener());
}

function handleStorageEvent(event: StorageEvent) {
  if (event.key !== STORAGE_KEY) return;
  const stored = readFromStorage();
  selection = stored.ids;
  updatedAt = stored.updatedAt;
  scheduleExpiry();
  listeners.forEach((listener) => listener());
}

function subscribe(callback: () => void): () => void {
  ensureInitialized();
  listeners.add(callback);
  if (listeners.size === 1 && typeof window !== "undefined") {
    window.addEventListener("storage", handleStorageEvent);
  }
  return () => {
    listeners.delete(callback);
    if (listeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorageEvent);
    }
  };
}

function getSnapshot(): string[] {
  ensureInitialized();
  return selection;
}

function getServerSnapshot(): string[] {
  return EMPTY_SELECTION;
}

export type CompareToggleResult = "added" | "removed" | "max-reached";

function toggleSelection(id: string): CompareToggleResult {
  ensureInitialized();
  if (selection.includes(id)) {
    selection = selection.filter((item) => item !== id);
    persist();
    return "removed";
  }
  if (selection.length >= MAX_COMPARE_SELECTION) {
    return "max-reached";
  }
  selection = [...selection, id];
  persist();
  return "added";
}

function removeFromSelection(id: string) {
  ensureInitialized();
  selection = selection.filter((item) => item !== id);
  persist();
}

function clearSelection() {
  ensureInitialized();
  selection = EMPTY_SELECTION;
  persist();
}

export function useCompareSelection() {
  const ids = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return {
    ids,
    isSelected: (id: string) => ids.includes(id),
    isMax: ids.length >= MAX_COMPARE_SELECTION,
    toggle: toggleSelection,
    remove: removeFromSelection,
    clear: clearSelection,
  };
}
