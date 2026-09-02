import { useEffect, useState, type ReactNode } from "react";
import type {
  DealStatus,
  Listing,
  ListingStatus,
  PropertyType,
  TransactionType,
} from "../data/listings";
import { NO_FLOOR_PLAN_UNIT_TYPE } from "../data/listings";
import type { FloorPlanImage } from "../data/floorPlans";
import {
  sortUnitTypesByAreaSimilarity,
  type UnitTypeAreaCandidate,
} from "../lib/floorPlanAreaSort";
import type { ComplexOption } from "../lib/naverImport";
import ListingPhotoManager, { type ListingPhoto } from "./ListingPhotoManager";

export const inputClass =
  "rounded-md border border-navy-900/15 bg-white px-3 py-2 text-sm text-navy-900 outline-none focus:border-gold-500";

const PROPERTY_TYPES: PropertyType[] = [
  "아파트",
  "오피스텔",
  "상가",
  "단독주택",
  "기타",
];

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  advertising: "광고중",
  negotiating: "계약진행",
  completed: "계약완료",
  hold: "보류",
};

export const DEAL_STATUS_BADGE_CLASS: Record<DealStatus, string> = {
  advertising: "bg-green-500/10 text-green-700",
  negotiating: "bg-blue-500/10 text-blue-700",
  completed: "bg-navy-900/10 text-navy-800",
  hold: "bg-orange-500/10 text-orange-700",
};

function formatLastVerifiedAt(iso: string | undefined): string {
  if (!iso) return "확인 기록 없음";
  const date = new Date(iso);
  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()} ${String(
    date.getHours(),
  ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")} 확인`;
}

/** lastVerifiedAt(ISO 문자열) → <input type="date">가 요구하는 YYYY-MM-DD. */
function toDateInputValue(iso: string | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function Field({
  label,
  children,
  full = false,
  className = "",
  hint,
}: {
  label: string;
  children: ReactNode;
  full?: boolean;
  className?: string;
  hint?: string;
}) {
  return (
    <label
      className={`flex flex-col gap-1.5 ${full ? "sm:col-span-2" : ""} ${className}`}
    >
      <span className="text-xs font-semibold text-navy-800/60">{label}</span>
      {children}
      {hint && <span className="text-xs text-navy-800/40">{hint}</span>}
    </label>
  );
}

export type ComplexMode = "existing" | "new";

export interface NewComplexState {
  name: string;
  address: string;
}

/**
 * 매물 등록(가져오기 미리보기)과 매물 수정(/admin/listings/[id]/edit)에서
 * 함께 사용하는 입력 필드 묶음입니다.
 */
export function ListingFormFields({
  draft,
  complexOptions,
  featuresInput,
  onChangeField,
  onChangeFeaturesInput,
  idEditable = true,
  showId = true,
  allowNewComplex = false,
  complexMode = "existing",
  onChangeComplexMode,
  newComplex,
  onChangeNewComplex,
  onPhotosChange,
  onPendingPhotoFilesChange,
  uncertainFields,
}: {
  draft: Listing;
  complexOptions: ComplexOption[];
  featuresInput: string;
  onChangeField: <K extends keyof Listing>(key: K, value: Listing[K]) => void;
  onChangeFeaturesInput: (value: string) => void;
  /** 이미 등록된 매물을 수정할 때는 ID를 바꿀 수 없도록 잠급니다. */
  idEditable?: boolean;
  /** 부모님용 등록 화면처럼 매물 ID 자체를 신경 쓸 필요 없는 곳에서는 숨깁니다. */
  showId?: boolean;
  /** "새 단지 추가"를 허용할지(매물 등록 화면에서만 true). */
  allowNewComplex?: boolean;
  complexMode?: ComplexMode;
  onChangeComplexMode?: (mode: ComplexMode) => void;
  newComplex?: NewComplexState;
  onChangeNewComplex?: (state: NewComplexState) => void;
  /** 이미 저장된 매물(draft.id가 실제 ID)일 때, 사진이 바뀔 때마다 현재 URL 목록을 알려줍니다. */
  onPhotosChange?: (photos: ListingPhoto[]) => void;
  /** 아직 저장 전(신규 등록)일 때, 선택된 파일 목록이 바뀔 때마다 알려줍니다. */
  onPendingPhotoFilesChange?: (files: File[]) => void;
  /**
   * 네이버 붙여넣기에서 텍스트로 확인하지 못해 0으로 채워진 숫자 필드의
   * 라벨 목록(getUncertainFieldLabels 결과, 예: "층수"/"전용면적"). 저장되는
   * draft 값 자체(0)는 그대로 두고, 이 라벨에 해당하는 입력칸만 화면에서
   * 빈 칸으로 보여줍니다 — 0이 실제 확인된 값처럼 보이지 않게 하기 위함이라,
   * 새 매물 수동 등록·기존 매물 수정 화면(이 prop을 넘기지 않음)은 그대로
   * 0을 보여줍니다.
   */
  uncertainFields?: string[];
}) {
  const isUncertain = (label: string) => uncertainFields?.includes(label) ?? false;
  const selectedComplex = complexOptions.find(
    (option) => option.id === draft.complexId,
  );

  // 선택된 단지에 이미 등록된 평면도 타입 후보(면적 포함). 있으면 드롭다운으로
  // 고르게 하고("해당 없음" 포함, 필수), 없으면(또는 단지 미선택) 새로 입력할
  // 수 있게 자유 입력칸을 보여줍니다(그 경우는 선택 사항으로 남겨둠).
  const [unitTypeCandidates, setUnitTypeCandidates] = useState<UnitTypeAreaCandidate[]>(
    [],
  );
  useEffect(() => {
    async function load() {
      if (!draft.complexId) {
        setUnitTypeCandidates([]);
        return;
      }
      try {
        const response = await fetch(
          `/api/admin/floor-plans?complexId=${encodeURIComponent(draft.complexId)}`,
        );
        const data = await response.json();
        if (!response.ok) {
          setUnitTypeCandidates([]);
          return;
        }
        const images = data.images as FloorPlanImage[];
        const byUnitType = new Map<string, UnitTypeAreaCandidate>();
        for (const image of images) {
          if (byUnitType.has(image.unitType)) continue;
          byUnitType.set(image.unitType, {
            unitType: image.unitType,
            exclusiveArea: image.exclusiveArea,
            supplyArea: image.supplyArea,
          });
        }
        setUnitTypeCandidates(Array.from(byUnitType.values()));
      } catch {
        setUnitTypeCandidates([]);
      }
    }
    load();
  }, [draft.complexId]);

  // 입력된 전용/공급면적과 가까운 후보가 위로 오도록 매 렌더마다 다시 정렬합니다
  // (후보가 많아야 한 자릿수라 비용이 무시할 만함).
  const sortedUnitTypeCandidates = sortUnitTypesByAreaSimilarity(
    unitTypeCandidates,
    draft.exclusiveArea || undefined,
    draft.supplyArea || undefined,
  );

  return (
    <>
      {draft.propertyType !== "상가" && (
      <div className="rounded-lg border border-navy-900/10 p-4">
        <p className="text-xs font-semibold text-navy-800/60">단지 · 건물</p>

        {allowNewComplex && (
          <div className="mt-2 flex gap-4 text-sm">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                checked={complexMode === "existing"}
                onChange={() => onChangeComplexMode?.("existing")}
              />
              기존 단지에서 선택
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                checked={complexMode === "new"}
                onChange={() => onChangeComplexMode?.("new")}
              />
              새 단지 추가
            </label>
          </div>
        )}

        {complexMode === "existing" ? (
          <div className="mt-3">
            <select
              value={draft.complexId}
              onChange={(event) => onChangeField("complexId", event.target.value)}
              className={`${inputClass} w-full`}
            >
              <option value="">단지를 선택해주세요</option>
              {complexOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
            {selectedComplex && selectedComplex.address && (
              <p className="mt-2 text-xs text-navy-800/50">
                주소: {selectedComplex.address}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="단지명 또는 건물명">
              <input
                value={newComplex?.name ?? ""}
                onChange={(event) =>
                  onChangeNewComplex?.({
                    name: event.target.value,
                    address: newComplex?.address ?? "",
                  })
                }
                placeholder="예: 호수마을 이편한세상 3단지"
                className={inputClass}
              />
            </Field>
            <Field label="주소">
              <input
                value={newComplex?.address ?? ""}
                onChange={(event) =>
                  onChangeNewComplex?.({
                    name: newComplex?.name ?? "",
                    address: event.target.value,
                  })
                }
                placeholder="예: 경기도 김포시 구래동 000-00"
                className={inputClass}
              />
            </Field>
          </div>
        )}
      </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="매물종류">
          <select
            value={draft.propertyType}
            onChange={(event) =>
              {
                const propertyType = event.target.value as PropertyType;
                onChangeField("propertyType", propertyType);
                if (propertyType === "상가") onChangeField("complexId", "");
              }
            }
            className={inputClass}
          >
            {PROPERTY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {draft.propertyType === "상가" && (
            <span className="text-xs text-navy-800/50">
              상가 매물은 주거 단지를 선택하지 않아도 등록할 수 있습니다.
            </span>
          )}
        </Field>

        <Field label="거래유형">
          <select
            value={draft.transactionType}
            onChange={(event) =>
              onChangeField(
                "transactionType",
                event.target.value as TransactionType,
              )
            }
            className={inputClass}
          >
            <option value="매매">매매</option>
            <option value="전세">전세</option>
            <option value="월세">월세</option>
          </select>
        </Field>

        {showId && (
          <Field label="매물 ID">
            <input
              value={draft.id}
              disabled={!idEditable}
              onChange={(event) => onChangeField("id", event.target.value)}
              className={
                idEditable
                  ? inputClass
                  : `${inputClass} cursor-not-allowed bg-navy-900/5 text-navy-800/50`
              }
            />
          </Field>
        )}

        <Field label="가격 (만원)" hint="숫자만 입력해주세요 (예: 42000)">
          <input
            type="number"
            value={draft.price}
            onChange={(event) =>
              onChangeField("price", Number(event.target.value))
            }
            className={inputClass}
          />
        </Field>

        <Field
          label="화면에 보여줄 가격"
          full
          hint='예: "4억 2,000만원" 처럼 손님이 볼 문구를 그대로 적어주세요'
        >
          <input
            value={draft.priceLabel}
            onChange={(event) =>
              onChangeField("priceLabel", event.target.value)
            }
            className={inputClass}
          />
        </Field>

        <Field label="동 (아는 경우만)">
          <input
            value={draft.building}
            onChange={(event) =>
              onChangeField("building", event.target.value)
            }
            placeholder="예: 201동"
            className={inputClass}
          />
        </Field>

        <Field label="층 / 전체 층수">
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={isUncertain("층수") ? "" : draft.floor}
              placeholder={isUncertain("층수") ? "확인 필요" : undefined}
              onChange={(event) =>
                onChangeField("floor", Number(event.target.value))
              }
              className={`${inputClass} w-full`}
            />
            <span className="text-sm text-navy-800/40">/</span>
            <input
              type="number"
              value={isUncertain("층수") ? "" : draft.totalFloors}
              placeholder={isUncertain("층수") ? "확인 필요" : undefined}
              onChange={(event) =>
                onChangeField("totalFloors", Number(event.target.value))
              }
              className={`${inputClass} w-full`}
            />
          </div>
        </Field>

        <Field label="전용면적(㎡)">
          <input
            type="number"
            step="0.01"
            value={isUncertain("전용면적") ? "" : draft.exclusiveArea}
            placeholder={isUncertain("전용면적") ? "확인 필요" : undefined}
            onChange={(event) =>
              onChangeField("exclusiveArea", Number(event.target.value))
            }
            className={inputClass}
          />
        </Field>

        <Field label="공급면적(㎡)">
          <input
            type="number"
            step="0.01"
            value={isUncertain("공급면적") ? "" : draft.supplyArea}
            placeholder={isUncertain("공급면적") ? "확인 필요" : undefined}
            onChange={(event) =>
              onChangeField("supplyArea", Number(event.target.value))
            }
            className={inputClass}
          />
        </Field>

        <Field
          label={sortedUnitTypeCandidates.length > 0 ? "평형 타입" : "평형 타입 (선택)"}
          hint={
            sortedUnitTypeCandidates.length > 0
              ? "이 단지에 평면도가 등록되어 있어 필수입니다. 해당하는 타입이 없으면 '해당 없음'을 골라주세요(면적이 가까운 순으로 위에 나옵니다)."
              : "이 단지에 등록된 평면도가 아직 없습니다. 새 타입명을 입력해주세요(예: 84A)."
          }
        >
          {sortedUnitTypeCandidates.length > 0 ? (
            <select
              required
              value={draft.unitType ?? ""}
              onChange={(event) => onChangeField("unitType", event.target.value)}
              className={inputClass}
            >
              {/* 아직 아무것도 안 골랐을 때만 보이는, 선택할 수 없는 자리표시자입니다.
                  "해당 없음"과 구분하기 위해 일부러 기본 선택값으로 두지 않습니다 —
                  건너뛰려면 반드시 "해당 없음"을 눌러야 합니다. */}
              {!draft.unitType && (
                <option value="" disabled hidden>
                  선택해주세요
                </option>
              )}
              <option value={NO_FLOOR_PLAN_UNIT_TYPE}>해당 없음 / 평면도 미등록</option>
              {/* 예전에 자유 입력으로 저장된 값이 목록에 없으면(오타 등) 잃어버리지 않도록 같이 보여줍니다. */}
              {draft.unitType &&
                draft.unitType !== NO_FLOOR_PLAN_UNIT_TYPE &&
                !sortedUnitTypeCandidates.some((c) => c.unitType === draft.unitType) && (
                  <option value={draft.unitType}>{draft.unitType} (목록에 없음)</option>
                )}
              {sortedUnitTypeCandidates.map((candidate) => (
                <option key={candidate.unitType} value={candidate.unitType}>
                  {candidate.unitType}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={draft.unitType ?? ""}
              onChange={(event) => onChangeField("unitType", event.target.value)}
              placeholder="예: 84A"
              className={inputClass}
            />
          )}
        </Field>

        <Field label="방 개수">
          <input
            type="number"
            value={isUncertain("방/욕실 수") ? "" : draft.roomCount}
            placeholder={isUncertain("방/욕실 수") ? "확인 필요" : undefined}
            onChange={(event) =>
              onChangeField("roomCount", Number(event.target.value))
            }
            className={inputClass}
          />
        </Field>

        <Field label="욕실 개수">
          <input
            type="number"
            value={isUncertain("방/욕실 수") ? "" : draft.bathroomCount}
            placeholder={isUncertain("방/욕실 수") ? "확인 필요" : undefined}
            onChange={(event) =>
              onChangeField("bathroomCount", Number(event.target.value))
            }
            className={inputClass}
          />
        </Field>

        <Field label="방향" hint="예: 남향, 남동향">
          <input
            value={draft.direction}
            onChange={(event) =>
              onChangeField("direction", event.target.value)
            }
            className={inputClass}
          />
        </Field>

        <Field label="입주 가능일" hint="예: 즉시입주, 협의 가능, 2026년 9월">
          <input
            value={draft.moveInDate}
            onChange={(event) =>
              onChangeField("moveInDate", event.target.value)
            }
            className={inputClass}
          />
        </Field>

        <Field label="관리비" hint="예: 약 15만원, 없음">
          <input
            value={draft.maintenanceFee ?? ""}
            onChange={(event) =>
              onChangeField("maintenanceFee", event.target.value)
            }
            placeholder="예: 약 15만원"
            className={inputClass}
          />
        </Field>

        <Field label="융자금">
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-2 text-sm text-navy-800">
              <input
                type="checkbox"
                checked={draft.hasLoan}
                onChange={(event) => {
                  const checked = event.target.checked;
                  onChangeField("hasLoan", checked);
                  if (!checked) onChangeField("loanAmount", null);
                }}
              />
              융자 있음
            </label>
            <input
              value={draft.loanAmount ?? ""}
              disabled={!draft.hasLoan}
              onChange={(event) =>
                onChangeField("loanAmount", event.target.value)
              }
              placeholder="예: 1억 5,000만원"
              className={
                draft.hasLoan
                  ? inputClass
                  : `${inputClass} cursor-not-allowed bg-navy-900/5 text-navy-800/50`
              }
            />
          </div>
        </Field>

        <Field label="대표매물 노출">
          <label className="flex items-center gap-2 text-sm text-navy-800">
            <input
              type="checkbox"
              checked={draft.isFeatured}
              onChange={(event) =>
                onChangeField("isFeatured", event.target.checked)
              }
            />
            홈페이지 추천매물 영역에 노출
          </label>
        </Field>

        <Field label="공개 상태">
          <label className="flex items-center gap-2 text-sm text-navy-800">
            <input
              type="checkbox"
              checked={draft.status === "published"}
              onChange={(event) =>
                onChangeField(
                  "status",
                  event.target.checked
                    ? ("published" as ListingStatus)
                    : ("draft" as ListingStatus),
                )
              }
            />
            지금 바로 홈페이지에 공개하기 (해제 시 임시저장)
          </label>
        </Field>

        <Field
          label="거래 진행 상태"
          hint="계약완료/보류는 공개 상태와 무관하게 홈페이지에서 자동으로 숨겨집니다."
        >
          <select
            value={draft.dealStatus}
            onChange={(event) =>
              onChangeField("dealStatus", event.target.value as DealStatus)
            }
            className={inputClass}
          >
            {(Object.keys(DEAL_STATUS_LABELS) as DealStatus[]).map((value) => (
              <option key={value} value={value}>
                {DEAL_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="마지막 확인일"
          hint="저장 시 이 값이 최종 반영됩니다. 네이버 재가져오기로 새 날짜를 찾으면 이 값이 제안값으로 바뀌며, 목록 화면의 '오늘 확인' 버튼으로도 갱신할 수 있습니다."
        >
          <input
            type="date"
            value={toDateInputValue(draft.lastVerifiedAt)}
            onChange={(event) =>
              onChangeField(
                "lastVerifiedAt",
                event.target.value
                  ? `${event.target.value}T00:00:00.000Z`
                  : undefined,
              )
            }
            className={inputClass}
          />
          <span className="mt-1 block text-xs text-navy-800/40">
            {formatLastVerifiedAt(draft.lastVerifiedAt)}
          </span>
        </Field>
      </div>

      <Field label="매물 설명" full className="mt-4">
        <textarea
          value={draft.shortDescription}
          onChange={(event) =>
            onChangeField("shortDescription", event.target.value)
          }
          rows={3}
          placeholder="예: 채광 좋은 남향, 올수리 상태, 즉시 입주 가능합니다."
          className={inputClass}
        />
      </Field>

      <Field
        label="특징 (선택, 쉼표로 구분)"
        full
        className="mt-4"
        hint="예: 남향, 역세권, 즉시입주"
      >
        <input
          value={featuresInput}
          onChange={(event) => onChangeFeaturesInput(event.target.value)}
          placeholder="남향, 역세권, 즉시입주"
          className={inputClass}
        />
      </Field>

      <div className="mt-4">
        <p className="text-xs font-semibold text-navy-800/60">사진</p>
        <div className="mt-2">
          <ListingPhotoManager
            listingId={draft.id || undefined}
            onPhotosChange={onPhotosChange}
            onPendingFilesChange={onPendingPhotoFilesChange}
          />
        </div>
      </div>
    </>
  );
}
