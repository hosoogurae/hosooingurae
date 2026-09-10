"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { buildSmsHref } from "../../../lib/listingInquiry";
import { normalizePhone } from "../../../lib/phoneNormalize";
import { buildContractPrepSms, getContractTypeLabel } from "../../../lib/contractPrepSms";
import {
  CONTRACT_PREP_ROLES,
  SPECIAL_CONTRACT_TYPES,
  type ContractPrepItem,
  type ContractPrepRole,
  type SpecialContractType,
} from "../../../lib/contractPrepItems";

const ROLES = CONTRACT_PREP_ROLES;
const ITEM_FORM_ROLES = ["공통", ...ROLES, ...SPECIAL_CONTRACT_TYPES] as const;
type ItemFormRole = (typeof ITEM_FORM_ROLES)[number];

const inputClass =
  "min-h-[52px] w-full rounded-lg border border-navy-900/15 px-3 text-base text-navy-900 outline-none focus:border-gold-500";

function getTodayDateStr(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** 같은 라벨이 두 번 등록돼 있어도(예: 공통과 역할에 같은 이름) 화면엔 한 번만 보여줍니다. */
function dedupeByLabel(items: ContractPrepItem[]): ContractPrepItem[] {
  const seen = new Set<string>();
  const result: ContractPrepItem[] = [];
  for (const item of items) {
    const key = item.label.trim();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

type EditingItem =
  | { mode: "new" | "edit"; id?: string; role: ItemFormRole; label: string; defaultChecked: boolean }
  | null;

/** 공통+역할+특수계약 항목을 관리(추가/수정/삭제/순서/기본체크)하는 접이식 섹션. */
function ItemManager({
  items,
  onChanged,
}: {
  items: ContractPrepItem[];
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState<EditingItem>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const groups = new Map<ItemFormRole, ContractPrepItem[]>();
    for (const role of ITEM_FORM_ROLES) groups.set(role, []);
    for (const item of items) {
      const list = groups.get(item.role as ItemFormRole);
      if (list) list.push(item);
    }
    return groups;
  }, [items]);

  async function handleSave() {
    if (!editing) return;
    const label = editing.label.trim();
    if (!label) {
      setSaveError("항목 이름을 입력해주세요.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const response = await fetch(
        editing.mode === "new"
          ? "/api/admin/contract-prep-items"
          : `/api/admin/contract-prep-items/${editing.id}`,
        {
          method: editing.mode === "new" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: editing.role,
            label,
            defaultChecked: editing.defaultChecked,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.errors?.[0] ?? "저장에 실패했습니다.");
      setEditing(null);
      onChanged();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("이 항목을 삭제할까요? 되돌릴 수 없습니다.")) return;
    setDeletingId(id);
    try {
      const response = await fetch(`/api/admin/contract-prep-items/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.errors?.[0] ?? "삭제에 실패했습니다.");
      onChanged();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleMove(roleItems: ContractPrepItem[], index: number, direction: -1 | 1) {
    const current = roleItems[index];
    const other = roleItems[index + direction];
    if (!current || !other) return;

    setMovingId(current.id);
    setSaveError(null);
    try {
      const responses = await Promise.all([
        fetch(`/api/admin/contract-prep-items/${current.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: other.sortOrder }),
        }),
        fetch(`/api/admin/contract-prep-items/${other.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: current.sortOrder }),
        }),
      ]);
      if (responses.some((response) => !response.ok)) {
        throw new Error("순서 변경에 실패했습니다.");
      }
      onChanged();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "순서 변경에 실패했습니다.");
    } finally {
      setMovingId(null);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-navy-900/10 bg-white p-4">
      {ITEM_FORM_ROLES.map((role) => {
        const roleItems = grouped.get(role) ?? [];
        return (
          <div key={role} className="mt-4 first:mt-0">
            <p className="text-xs font-bold text-navy-800/60">{role}</p>
            <ul className="mt-1.5 flex flex-col gap-1.5">
              {roleItems.map((item, index) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-navy-900/10 px-3 py-2 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate text-navy-900">
                    {item.label}
                    {!item.defaultChecked && (
                      <span className="ml-1.5 text-xs font-normal text-navy-800/40">
                        (기본 미체크)
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleMove(roleItems, index, -1)}
                      disabled={index === 0 || movingId !== null}
                      aria-label="위로 이동"
                      className="text-xs font-semibold text-navy-800/50 hover:text-gold-600 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(roleItems, index, 1)}
                      disabled={index === roleItems.length - 1 || movingId !== null}
                      aria-label="아래로 이동"
                      className="text-xs font-semibold text-navy-800/50 hover:text-gold-600 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setEditing({
                          mode: "edit",
                          id: item.id,
                          role,
                          label: item.label,
                          defaultChecked: item.defaultChecked,
                        })
                      }
                      className="text-xs font-semibold text-navy-800/60 hover:text-gold-600 hover:underline"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                    >
                      {deletingId === item.id ? "삭제 중..." : "삭제"}
                    </button>
                  </span>
                </li>
              ))}
              {roleItems.length === 0 && (
                <li className="rounded-md border border-dashed border-navy-900/15 px-3 py-2 text-xs text-navy-800/40">
                  항목 없음
                </li>
              )}
            </ul>
            <button
              type="button"
              onClick={() =>
                setEditing({ mode: "new", role, label: "", defaultChecked: true })
              }
              className="mt-1.5 text-xs font-bold text-gold-600 hover:underline"
            >
              + {role}에 항목 추가
            </button>
          </div>
        );
      })}

      {editing && (
        <div className="mt-4 rounded-lg border border-gold-500/40 bg-gold-500/5 p-3">
          <p className="text-xs font-bold text-navy-900">
            {editing.mode === "new" ? "새 항목" : "항목 수정"} · {editing.role}
          </p>
          <input
            value={editing.label}
            onChange={(event) =>
              setEditing((prev) => (prev ? { ...prev, label: event.target.value } : prev))
            }
            placeholder="예: 신분증"
            className={`${inputClass} mt-2`}
          />
          <label className="mt-2 flex min-h-[40px] items-center gap-2 text-sm text-navy-900">
            <input
              type="checkbox"
              checked={editing.defaultChecked}
              onChange={(event) =>
                setEditing((prev) =>
                  prev ? { ...prev, defaultChecked: event.target.checked } : prev,
                )
              }
              className="h-4 w-4"
            />
            화면에 처음 보여줄 때 기본으로 체크
          </label>
          {saveError && <p className="mt-2 text-xs text-red-600">{saveError}</p>}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="min-h-[40px] flex-1 rounded-lg bg-navy-950 text-sm font-bold text-white disabled:opacity-60"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setSaveError(null);
              }}
              className="min-h-[40px] flex-1 rounded-lg border border-navy-900/15 text-sm font-bold text-navy-800"
            >
              취소
            </button>
          </div>
        </div>
      )}
      {saveError && !editing && (
        <p className="mt-3 text-xs text-red-600">{saveError}</p>
      )}
    </div>
  );
}

export default function ContractPrepSmsPage() {
  const [items, setItems] = useState<ContractPrepItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showItemManager, setShowItemManager] = useState(false);

  const [role, setRole] = useState<ContractPrepRole>("매수인");
  // null = 아직 사람이 손대지 않음(항목별 defaultChecked를 그대로 씀).
  const [checkedIds, setCheckedIds] = useState<Set<string> | null>(null);

  // 특수계약(공동명의/대리계약/법인계약) — 기본은 전부 꺼짐. 켠 유형만 그
  // 유형의 준비물 목록을 보여줍니다. 유형별로 별도의 "손대지 않음(null)"
  // 상태를 둬서, 다른 유형을 껐다 켜도 서로 상태가 섞이지 않게 합니다.
  const [activeSpecialTypes, setActiveSpecialTypes] = useState<Set<SpecialContractType>>(
    new Set(),
  );
  const [specialCheckedByType, setSpecialCheckedByType] = useState<
    Record<SpecialContractType, Set<string> | null>
  >({ 공동명의: null, 대리계약: null, 법인계약: null });

  const [customerName, setCustomerName] = useState("");
  const [dateStr, setDateStr] = useState(getTodayDateStr);
  const [timeStr, setTimeStr] = useState("18:00");
  const [phone, setPhone] = useState("");

  // null = "아직 사람이 손대지 않음"(자동 생성 값을 그대로 씀). 사람이
  // textarea를 고치는 순간부터만 실제 문자열을 들고, 그 뒤로는 입력이
  // 바뀌어도 자동으로 덮어쓰지 않습니다 — 생성은 초안이고 최종 문장은
  // 사람이 정합니다.
  const [manualBody, setManualBody] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function loadItems() {
    try {
      const response = await fetch("/api/admin/contract-prep-items");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.errors?.[0] ?? "항목을 불러오지 못했습니다.");
      }
      setItems(data.items as ContractPrepItem[]);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    }
  }

  useEffect(() => {
    async function run() {
      await loadItems();
    }
    run();
  }, []);

  // 공통 + 선택한 역할의 항목을 라벨 기준으로 중복 제거합니다(예: 임대인의
  // "통장 사본"이 공통에도 있으면 한 번만 보여줌).
  const visibleItems = useMemo(() => {
    if (!items) return [];
    const combined = items.filter((item) => item.role === "공통" || item.role === role);
    return dedupeByLabel(combined);
  }, [items, role]);

  // checkedIds가 null이면(역할을 막 바꿨거나 항목이 막 로드된 상태) 렌더
  // 시점에 "항목별 기본 체크값"을 즉석에서 계산합니다 — effect로 상태를
  // 되돌리지 않고, 파생값을 렌더 중에 직접 구하는 방식입니다.
  const effectiveCheckedIds = useMemo(
    () =>
      checkedIds ??
      new Set(visibleItems.filter((item) => item.defaultChecked).map((item) => item.id)),
    [checkedIds, visibleItems],
  );

  const checkedLabels = useMemo(
    () =>
      visibleItems
        .filter((item) => effectiveCheckedIds.has(item.id))
        .map((item) => item.label),
    [visibleItems, effectiveCheckedIds],
  );

  /** 특정 특수계약 유형의 항목 목록(라벨 중복 제거). */
  function getSpecialItems(type: SpecialContractType): ContractPrepItem[] {
    if (!items) return [];
    return dedupeByLabel(items.filter((item) => item.role === type));
  }

  function getEffectiveSpecialCheckedIds(type: SpecialContractType): Set<string> {
    const stored = specialCheckedByType[type];
    if (stored) return stored;
    return new Set(getSpecialItems(type).filter((item) => item.defaultChecked).map((item) => item.id));
  }

  // 켜진 특수계약 유형들의 체크된 준비물 라벨 전부(문자 생성에 "추가
  // 준비물"로 들어갑니다).
  const specialItemLabels = useMemo(() => {
    const labels: string[] = [];
    for (const type of SPECIAL_CONTRACT_TYPES) {
      if (!activeSpecialTypes.has(type)) continue;
      const typeItems = getSpecialItems(type);
      const checked = getEffectiveSpecialCheckedIds(type);
      for (const item of typeItems) {
        if (checked.has(item.id)) labels.push(item.label);
      }
    }
    return labels;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, activeSpecialTypes, specialCheckedByType]);

  const autoBody =
    dateStr && timeStr
      ? buildContractPrepSms({
          role,
          customerName,
          dateStr,
          timeStr,
          items: checkedLabels,
          specialItems: specialItemLabels,
        })
      : "";
  const body = manualBody ?? autoBody;

  function handleRoleSelect(nextRole: ContractPrepRole) {
    setRole(nextRole);
    setCheckedIds(null);
  }

  function toggleItem(id: string) {
    const next = new Set(effectiveCheckedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setCheckedIds(next);
  }

  function toggleSpecialType(type: SpecialContractType) {
    setActiveSpecialTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  function toggleSpecialItem(type: SpecialContractType, id: string) {
    const current = getEffectiveSpecialCheckedIds(type);
    const next = new Set(current);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSpecialCheckedByType((prev) => ({ ...prev, [type]: next }));
  }

  function handleRegenerate() {
    if (manualBody !== null && !confirm("직접 고친 내용을 지우고 다시 만들까요?")) return;
    setManualBody(null);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(body);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch {
      setCopyStatus("failed");
    }
  }

  async function handlePasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setPhone(text.trim());
    } catch {
      // 클립보드 권한이 없으면 조용히 무시 — 직접 입력하면 됩니다.
    }
  }

  const smsHref = phone.trim() ? buildSmsHref(normalizePhone(phone), body) : null;
  const contractTypeLabel = getContractTypeLabel(role);

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 sm:py-16">
      <p className="text-sm font-semibold tracking-wide text-gold-600">ADMIN</p>
      <h1 className="mt-2 text-2xl font-black text-navy-950 sm:text-3xl">
        계약 준비물 문자
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-navy-800/70">
        역할과 준비물을 고르고 날짜·시간을 넣으면 문자 초안이 만들어집니다.
        보내기 전에 아래 내용을 직접 확인하고 고쳐주세요. 금액은 자동으로
        넣지 않습니다.
      </p>
      <Link
        href="/admin/sms/compose"
        className="mt-2 inline-block text-sm font-bold text-gold-600 underline-offset-2 hover:underline"
      >
        일반 문자 작성 →
      </Link>

      {loadError && (
        <p className="mt-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {loadError}
        </p>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-bold text-navy-900">
          역할 <span className="font-normal text-navy-800/50">({contractTypeLabel})</span>
        </h2>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ROLES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => handleRoleSelect(option)}
              className={`min-h-[48px] rounded-lg border text-sm font-bold transition-colors ${
                role === option
                  ? "border-gold-500 bg-gold-500/10 text-gold-700"
                  : "border-navy-900/15 text-navy-800"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-navy-900">준비물</h2>
          <button
            type="button"
            onClick={() => setShowItemManager((prev) => !prev)}
            className="text-xs font-bold text-gold-600 hover:underline"
          >
            {showItemManager ? "항목 관리 닫기" : "항목 관리"}
          </button>
        </div>

        {items === null && !loadError && (
          <p className="mt-2 text-sm text-navy-800/50">불러오는 중...</p>
        )}
        {visibleItems.length === 0 && items !== null && (
          <p className="mt-2 text-sm text-navy-800/50">
            이 역할에 등록된 항목이 없습니다. 아래 항목 관리에서 추가해주세요.
          </p>
        )}

        <div className="mt-2 flex flex-col gap-2">
          {visibleItems.map((item) => (
            <label
              key={item.id}
              className="flex min-h-[48px] items-center gap-3 rounded-lg border border-navy-900/15 px-3 text-base text-navy-900"
            >
              <input
                type="checkbox"
                checked={effectiveCheckedIds.has(item.id)}
                onChange={() => toggleItem(item.id)}
                className="h-5 w-5"
              />
              {item.label}
            </label>
          ))}
        </div>

        {showItemManager && <ItemManager items={items ?? []} onChanged={loadItems} />}
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold text-navy-900">특수계약 (선택)</h2>
        <p className="mt-1 text-xs text-navy-800/50">
          공동명의·대리계약·법인계약처럼 일반적인 경우와 다른 계약이면 체크해서
          해당 준비물을 추가로 골라주세요. 아무것도 체크하지 않으면 문자에
          영향을 주지 않습니다.
        </p>
        <div className="mt-2 flex flex-col gap-2">
          {SPECIAL_CONTRACT_TYPES.map((type) => {
            const isActive = activeSpecialTypes.has(type);
            const typeItems = getSpecialItems(type);
            const checkedIdsForType = getEffectiveSpecialCheckedIds(type);
            return (
              <div key={type}>
                <label className="flex min-h-[48px] items-center gap-3 rounded-lg border border-navy-900/15 px-3 text-base text-navy-900">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={() => toggleSpecialType(type)}
                    className="h-5 w-5"
                  />
                  {type}
                </label>
                {isActive && (
                  <div className="mt-2 flex flex-col gap-2 pl-4">
                    {typeItems.length === 0 ? (
                      <p className="text-xs text-navy-800/50">
                        아직 등록된 {type} 준비물이 없습니다. 아래 항목 관리에서
                        추가해주세요.
                      </p>
                    ) : (
                      typeItems.map((item) => (
                        <label
                          key={item.id}
                          className="flex min-h-[44px] items-center gap-3 rounded-lg border border-navy-900/10 bg-navy-900/[0.02] px-3 text-sm text-navy-900"
                        >
                          <input
                            type="checkbox"
                            checked={checkedIdsForType.has(item.id)}
                            onChange={() => toggleSpecialItem(type, item.id)}
                            className="h-4 w-4"
                          />
                          {item.label}
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-6 grid grid-cols-2 gap-3">
        <label className="block text-sm font-bold text-navy-900">
          손님 이름(선택)
          <input
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            placeholder="예: 김철수"
            className={`${inputClass} mt-1.5`}
          />
        </label>
        <div />
        <label className="block text-sm font-bold text-navy-900">
          계약일
          <input
            type="date"
            value={dateStr}
            onChange={(event) => setDateStr(event.target.value)}
            className={`${inputClass} mt-1.5`}
          />
        </label>
        <label className="block text-sm font-bold text-navy-900">
          시간
          <input
            type="time"
            value={timeStr}
            onChange={(event) => setTimeStr(event.target.value)}
            className={`${inputClass} mt-1.5`}
          />
        </label>
      </section>

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-navy-900">문자 내용</h2>
          <button
            type="button"
            onClick={handleRegenerate}
            className="text-xs font-bold text-gold-600 hover:underline"
          >
            다시 생성
          </button>
        </div>
        <textarea
          value={body}
          onChange={(event) => setManualBody(event.target.value)}
          rows={8}
          className="mt-2 w-full rounded-lg border border-navy-900/15 px-3 py-2.5 text-base leading-relaxed text-navy-900 outline-none focus:border-gold-500"
        />
        <p className="mt-1.5 text-xs text-navy-800/50">
          위 내용은 초안입니다. 보내기 전에 직접 확인하고 고쳐주세요(특히
          계약금 등 금액은 이 화면이 채우지 않습니다).
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold text-navy-900">받는 사람</h2>
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="010-0000-0000"
          inputMode="tel"
          className={`${inputClass} mt-2`}
        />
        <button
          type="button"
          onClick={handlePasteFromClipboard}
          className="mt-2 min-h-[48px] w-full rounded-lg border border-navy-900/15 text-sm font-bold text-navy-800"
        >
          붙여넣기
        </button>
      </section>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleCopy}
          className="min-h-[56px] flex-1 rounded-xl border border-navy-900/15 text-base font-bold text-navy-800"
        >
          {copyStatus === "copied"
            ? "복사됨"
            : copyStatus === "failed"
              ? "복사 실패"
              : "복사"}
        </button>
        {smsHref ? (
          <a
            href={smsHref}
            className="flex min-h-[56px] flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-base font-bold text-navy-950 shadow-md shadow-gold-500/30"
          >
            문자 보내기
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="min-h-[56px] flex-1 cursor-not-allowed rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-base font-bold text-navy-950 opacity-50 shadow-md shadow-gold-500/30"
          >
            문자 보내기
          </button>
        )}
      </div>
    </div>
  );
}
