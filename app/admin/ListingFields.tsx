import type { ReactNode } from "react";
import type {
  Listing,
  ListingStatus,
  PropertyType,
  TransactionType,
} from "../data/listings";
import type { ComplexOption } from "../lib/naverImport";

export const inputClass =
  "rounded-md border border-navy-900/15 bg-white px-3 py-2 text-sm text-navy-900 outline-none focus:border-gold-500";

const PROPERTY_TYPES: PropertyType[] = [
  "아파트",
  "오피스텔",
  "상가",
  "단독주택",
  "기타",
];

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
}) {
  const selectedComplex = complexOptions.find(
    (option) => option.id === draft.complexId,
  );

  return (
    <>
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

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="매물종류">
          <select
            value={draft.propertyType}
            onChange={(event) =>
              onChangeField("propertyType", event.target.value as PropertyType)
            }
            className={inputClass}
          >
            {PROPERTY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
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
              value={draft.floor}
              onChange={(event) =>
                onChangeField("floor", Number(event.target.value))
              }
              className={`${inputClass} w-full`}
            />
            <span className="text-sm text-navy-800/40">/</span>
            <input
              type="number"
              value={draft.totalFloors}
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
            value={draft.exclusiveArea}
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
            value={draft.supplyArea}
            onChange={(event) =>
              onChangeField("supplyArea", Number(event.target.value))
            }
            className={inputClass}
          />
        </Field>

        <Field label="방 개수">
          <input
            type="number"
            value={draft.roomCount}
            onChange={(event) =>
              onChangeField("roomCount", Number(event.target.value))
            }
            className={inputClass}
          />
        </Field>

        <Field label="욕실 개수">
          <input
            type="number"
            value={draft.bathroomCount}
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
        <p className="mt-1 text-sm text-navy-800/50">
          {draft.images && draft.images.length > 0
            ? `${draft.images.length}장`
            : "사진 업로드는 아직 준비 중입니다. 상세페이지에는 임시 이미지가 표시됩니다."}
        </p>
      </div>
    </>
  );
}
