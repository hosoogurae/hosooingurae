import { useSyncExternalStore } from "react";
import { MAX_COMPARE_SELECTION } from "./compareConstants";

/**
 * "매물 비교" 선택 상태 — 서버/DB에 저장하지 않는 순수 클라이언트 상태입니다.
 * 확정된 비교는 /compare?ids=...의 URL 자체가 영속 저장소 역할을 하므로,
 * 선택 중(체크박스 단계)에만 필요한 이 상태는 localStorage에 두는 것으로
 * 충분합니다. TransactionPriceChart/InquirySmsButton과 같은
 * useSyncExternalStore 패턴을 그대로 따릅니다.
 */

const STORAGE_KEY = "hosoo:compareSelection";

const EMPTY_SELECTION: string[] = [];

let selection: string[] = EMPTY_SELECTION;
let initialized = false;
const listeners = new Set<() => void>();

function readFromStorage(): string[] {
  if (typeof window === "undefined") return EMPTY_SELECTION;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_SELECTION;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : EMPTY_SELECTION;
  } catch {
    return EMPTY_SELECTION;
  }
}

function ensureInitialized() {
  if (initialized || typeof window === "undefined") return;
  selection = readFromStorage();
  initialized = true;
}

function persist() {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
    } catch {
      // 저장 공간이 없는 환경(시크릿 모드 등)은 조용히 무시합니다. 이번 탭
      // 안에서는 메모리 상태로 계속 동작합니다.
    }
  }
  listeners.forEach((listener) => listener());
}

function handleStorageEvent(event: StorageEvent) {
  if (event.key !== STORAGE_KEY) return;
  selection = readFromStorage();
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
