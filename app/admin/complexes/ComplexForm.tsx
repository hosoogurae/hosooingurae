"use client";

import { useState } from "react";
import type { Complex } from "../../data/complexes";
import type { ComplexFieldsInput } from "../../lib/complexValidation";
import type { MolitCheckSample } from "../../api/admin/molit-check/route";
import {
  findLawdCodeFromAddress,
  findUniqueMolitComplexMatch,
} from "../../lib/molitComplexMatch";
import {
  getUncertainComplexFieldLabels,
  parseNaverComplexText,
  type ParsedNaverComplex,
} from "../../lib/parseNaverComplex";

const inputClass =
  "rounded-md border border-navy-900/15 bg-white px-3 py-2 text-sm text-navy-900 outline-none focus:border-gold-500";

interface ComplexFormValues {
  name: string;
  address: string;
  propertyType: string;
  approvalDate: string;
  totalHouseholds: string;
  buildings: string;
  parkingCount: string;
  parkingPerHousehold: string;
  heating: string;
  hallwayType: string;
  builder: string;
  maxFloor: string;
  floorAreaRatio: string;
  buildingCoverageRatio: string;
  managementOfficePhone: string;
  managementFeeWon: string;
  managementFeeRaw: string;
  managementFeeAsOf: string;
  features: string;
  subway: string;
  subwayDistance: string;
  subwayWalkMinutes: string;
  nearbySchools: string;
  buses: string;
  molitLawdCode: string;
  molitAptSeq: string;
}

function toFormValues(complex?: Complex | null): ComplexFormValues {
  return {
    name: complex?.name ?? "",
    address: complex?.address ?? "",
    propertyType: complex?.propertyType ?? "",
    approvalDate: complex?.approvalDate ?? "",
    totalHouseholds:
      complex?.totalHouseholds !== undefined ? String(complex.totalHouseholds) : "",
    buildings: complex?.buildings !== undefined ? String(complex.buildings) : "",
    parkingCount:
      complex?.parkingCount !== undefined ? String(complex.parkingCount) : "",
    parkingPerHousehold:
      complex?.parkingPerHousehold !== undefined
        ? String(complex.parkingPerHousehold)
        : "",
    heating: complex?.heating ?? "",
    hallwayType: complex?.hallwayType ?? "",
    builder: complex?.builder ?? "",
    maxFloor: complex?.maxFloor !== undefined ? String(complex.maxFloor) : "",
    floorAreaRatio:
      complex?.floorAreaRatio !== undefined ? String(complex.floorAreaRatio) : "",
    buildingCoverageRatio:
      complex?.buildingCoverageRatio !== undefined
        ? String(complex.buildingCoverageRatio)
        : "",
    managementOfficePhone: complex?.managementOfficePhone ?? "",
    managementFeeWon:
      complex?.managementFeeWon !== undefined ? String(complex.managementFeeWon) : "",
    managementFeeRaw: complex?.managementFeeRaw ?? "",
    managementFeeAsOf: complex?.managementFeeAsOf ?? "",
    features: complex?.features?.join(", ") ?? "",
    subway: complex?.transportation.subway ?? "",
    subwayDistance: complex?.transportation.subwayDistance ?? "",
    subwayWalkMinutes:
      complex?.transportation.subwayWalkMinutes !== undefined
        ? String(complex.transportation.subwayWalkMinutes)
        : "",
    nearbySchools: complex?.nearbySchools?.join(", ") ?? "",
    buses: complex?.transportation.buses?.join(", ") ?? "",
    molitLawdCode: complex?.molit?.lawdCode ?? "",
    molitAptSeq: complex?.molit?.aptSeq ?? "",
  };
}

/**
 * 파싱된 값이 있는 필드만 덮어쓰고, 못 찾은 필드는 화면에 이미 입력돼 있던
 * 값을 그대로 유지합니다(파싱 실패로 기존 데이터가 지워지는 사고 방지).
 */
function mergeParsedComplex(
  prev: ComplexFormValues,
  parsed: ParsedNaverComplex,
): ComplexFormValues {
  return {
    ...prev,
    name: parsed.name ?? prev.name,
    address: parsed.address ?? prev.address,
    approvalDate: parsed.approvalDate ?? prev.approvalDate,
    totalHouseholds:
      parsed.totalHouseholds !== undefined
        ? String(parsed.totalHouseholds)
        : prev.totalHouseholds,
    buildings:
      parsed.buildings !== undefined ? String(parsed.buildings) : prev.buildings,
    maxFloor: parsed.maxFloor !== undefined ? String(parsed.maxFloor) : prev.maxFloor,
    heating: parsed.heating ?? prev.heating,
    builder: parsed.builder ?? prev.builder,
    parkingCount:
      parsed.parkingCount !== undefined
        ? String(parsed.parkingCount)
        : prev.parkingCount,
    parkingPerHousehold:
      parsed.parkingPerHousehold !== undefined
        ? String(parsed.parkingPerHousehold)
        : prev.parkingPerHousehold,
    floorAreaRatio:
      parsed.floorAreaRatio !== undefined
        ? String(parsed.floorAreaRatio)
        : prev.floorAreaRatio,
    buildingCoverageRatio:
      parsed.buildingCoverageRatio !== undefined
        ? String(parsed.buildingCoverageRatio)
        : prev.buildingCoverageRatio,
    managementOfficePhone:
      parsed.managementOfficePhone ?? prev.managementOfficePhone,
    managementFeeRaw: parsed.managementFeeRaw ?? prev.managementFeeRaw,
    managementFeeWon:
      parsed.managementFeeRaw !== undefined
        ? parsed.managementFeeWon === null || parsed.managementFeeWon === undefined
          ? ""
          : String(parsed.managementFeeWon)
        : prev.managementFeeWon,
    managementFeeAsOf: parsed.managementFeeAsOf ?? prev.managementFeeAsOf,
    nearbySchools: parsed.nearbySchools?.join(", ") ?? prev.nearbySchools,
    subway: parsed.subway ?? prev.subway,
    subwayDistance: parsed.subwayDistance ?? prev.subwayDistance,
    subwayWalkMinutes:
      parsed.subwayWalkMinutes !== undefined
        ? String(parsed.subwayWalkMinutes)
        : prev.subwayWalkMinutes,
    buses: parsed.buses?.join(", ") ?? prev.buses,
  };
}

function toStringList(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter((item) => item !== "");
}

function toNullableNumber(value: string): number | null | { error: true } {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return { error: true };
  return parsed;
}

function toFieldsInput(
  values: ComplexFormValues,
): { input?: ComplexFieldsInput; errors?: string[] } {
  const errors: string[] = [];
  const numeric: Record<string, number | null> = {};

  const numberFields: [keyof ComplexFormValues, string][] = [
    ["totalHouseholds", "세대수"],
    ["buildings", "동수"],
    ["parkingCount", "총 주차대수"],
    ["parkingPerHousehold", "세대당 주차대수"],
    ["maxFloor", "최고층"],
    ["floorAreaRatio", "용적률"],
    ["buildingCoverageRatio", "건폐율"],
    ["subwayWalkMinutes", "지하철 도보시간"],
    ["managementFeeWon", "관리비"],
  ];

  for (const [key, label] of numberFields) {
    const result = toNullableNumber(values[key]);
    if (typeof result === "object" && result !== null && "error" in result) {
      errors.push(`${label}은 숫자로 입력해주세요.`);
      continue;
    }
    numeric[key] = result;
  }

  if (values.name.trim() === "") {
    errors.push("단지명을 입력해주세요.");
  }

  if (errors.length > 0) {
    return { errors };
  }

  return {
    input: {
      name: values.name.trim(),
      address: values.address.trim(),
      propertyType: values.propertyType.trim() || null,
      approvalDate: values.approvalDate.trim() || null,
      totalHouseholds: numeric.totalHouseholds,
      buildings: numeric.buildings,
      parkingCount: numeric.parkingCount,
      parkingPerHousehold: numeric.parkingPerHousehold,
      heating: values.heating.trim() || null,
      hallwayType: values.hallwayType.trim() || null,
      builder: values.builder.trim() || null,
      maxFloor: numeric.maxFloor,
      floorAreaRatio: numeric.floorAreaRatio,
      buildingCoverageRatio: numeric.buildingCoverageRatio,
      managementOfficePhone: values.managementOfficePhone.trim() || null,
      managementFeeWon: numeric.managementFeeWon,
      managementFeeRaw: values.managementFeeRaw.trim() || null,
      managementFeeAsOf: values.managementFeeAsOf.trim() || null,
      features: toStringList(values.features),
      subway: values.subway.trim() || null,
      subwayDistance: values.subwayDistance.trim() || null,
      subwayWalkMinutes: numeric.subwayWalkMinutes,
      nearbySchools: toStringList(values.nearbySchools),
      buses: toStringList(values.buses),
      molitLawdCode: values.molitLawdCode.trim() || null,
      molitAptSeq: values.molitAptSeq.trim() || null,
    },
  };
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-navy-800/60">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-navy-800/40">{hint}</span>}
    </label>
  );
}

type MolitCheckResult =
  | { status: "idle" }
  | { status: "checking" }
  | {
      status: "success";
      matchCount: number;
      totalTradesInRegion: number;
      sample: MolitCheckSample[];
    }
  | { status: "error"; message: string };

interface MolitComplexResult {
  aptSeq: string;
  aptNm: string;
  tradeCount: number;
}

export default function ComplexForm({
  initial,
  onSubmit,
  submitLabel,
  allowNaverPaste = false,
}: {
  initial?: Complex | null;
  onSubmit: (input: ComplexFieldsInput) => Promise<{ error?: string }>;
  submitLabel: string;
  /** 단지 편집 화면에서만 true로 켭니다("새 단지 추가" 화면은 요청 범위 밖). */
  allowNaverPaste?: boolean;
}) {
  const [values, setValues] = useState<ComplexFormValues>(toFormValues(initial));
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [molitResult, setMolitResult] = useState<MolitCheckResult>({ status: "idle" });
  const [molitSearching, setMolitSearching] = useState(false);
  const [molitSearchError, setMolitSearchError] = useState("");
  const [molitComplexes, setMolitComplexes] = useState<MolitComplexResult[]>([]);
  const [molitNameFilter, setMolitNameFilter] = useState("");
  const [molitSearchResolved, setMolitSearchResolved] = useState(
    Boolean(initial?.molit?.aptSeq) || !allowNaverPaste,
  );
  const [naverPastedText, setNaverPastedText] = useState("");
  const [naverUncertainFields, setNaverUncertainFields] = useState<string[] | null>(
    null,
  );

  function update<K extends keyof ComplexFormValues>(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleNaverAutoFill() {
    if (!naverPastedText.trim()) return;
    const parsed = parseNaverComplexText(naverPastedText);
    const lawdCode = parsed.address
      ? findLawdCodeFromAddress(parsed.address)
      : undefined;
    setValues((prev) => ({
      ...mergeParsedComplex(prev, parsed),
      molitLawdCode: lawdCode ?? prev.molitLawdCode,
      molitAptSeq: lawdCode ? "" : prev.molitAptSeq,
    }));
    setNaverUncertainFields([
      ...getUncertainComplexFieldLabels(parsed),
      ...(parsed.notices ?? []),
    ]);
    if (lawdCode && parsed.name) {
      await searchMolitComplexes(lawdCode, parsed.name);
    } else {
      setMolitSearchError(
        "주소에서 지역코드를 확인하지 못했습니다. MOLIT 정보를 직접 입력해주세요.",
      );
      setMolitSearchResolved(true);
    }
  }

  async function searchMolitComplexes(lawdCode: string, complexName: string) {
    if (!/^\d{5}$/.test(lawdCode.trim())) {
      setMolitSearchError("지역코드(lawdCode)는 5자리 숫자로 입력해주세요.");
      setMolitSearchResolved(true);
      return;
    }
    setMolitSearching(true);
    setMolitSearchError("");
    setMolitComplexes([]);
    try {
      const response = await fetch("/api/admin/molit-complex-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lawdCode: lawdCode.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMolitSearchError(data.error ?? data.errors?.[0] ?? "단지 검색에 실패했습니다.");
      } else {
        const complexes: MolitComplexResult[] = data.complexes ?? [];
        const exactMatch = findUniqueMolitComplexMatch(complexName, complexes);
        setMolitComplexes(complexes);
        if (exactMatch) {
          setValues((prev) => ({
            ...prev,
            molitLawdCode: lawdCode,
            molitAptSeq: exactMatch.aptSeq,
          }));
        } else {
          setMolitSearchError(
            "단지명과 정확히 일치하는 결과가 없습니다. 아래에서 직접 선택하거나 코드를 입력해주세요.",
          );
        }
      }
    } catch {
      setMolitSearchError("네트워크 오류가 발생했습니다.");
    } finally {
      setMolitSearching(false);
      setMolitSearchResolved(true);
    }
  }

  async function handleMolitSearch() {
    await searchMolitComplexes(values.molitLawdCode, values.name);
  }

  async function handleMolitCheck() {
    if (values.molitLawdCode.trim() === "" || values.molitAptSeq.trim() === "") {
      setMolitResult({
        status: "error",
        message: "지역코드(lawdCode)와 단지코드(aptSeq)를 먼저 입력해주세요.",
      });
      return;
    }
    setMolitResult({ status: "checking" });
    try {
      const response = await fetch("/api/admin/molit-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lawdCode: values.molitLawdCode.trim(),
          aptSeq: values.molitAptSeq.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setMolitResult({
          status: "error",
          message: data.error ?? data.errors?.[0] ?? "확인에 실패했습니다.",
        });
        return;
      }
      setMolitResult({
        status: "success",
        matchCount: data.matchCount,
        totalTradesInRegion: data.totalTradesInRegion,
        sample: data.sample,
      });
    } catch {
      setMolitResult({ status: "error", message: "네트워크 오류가 발생했습니다." });
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const { input, errors: validationErrors } = toFieldsInput(values);
    if (!input) {
      setErrors(validationErrors ?? []);
      return;
    }
    setErrors([]);
    setSaving(true);
    try {
      const result = await onSubmit(input);
      if (result.error) {
        setErrors([result.error]);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      {allowNaverPaste && (
        <section className="rounded-xl border border-navy-900/10 p-6 sm:p-8">
          <h2 className="text-base font-bold text-navy-950">네이버 단지정보 붙여넣기</h2>
          <p className="mt-1 text-xs leading-relaxed text-navy-800/60">
            네이버 부동산 단지정보 탭에서 복사한 텍스트를 붙여넣고 자동 채우기를
            누르면 아래 항목이 채워집니다. 인식하지 못한 항목은 기존 값을 그대로
            두니, 채워진 뒤 내용을 확인·수정하고 저장해주세요.
          </p>
          <div className="mt-4">
            <textarea
              value={naverPastedText}
              onChange={(event) => setNaverPastedText(event.target.value)}
              rows={8}
              placeholder="네이버 부동산 단지정보 탭에서 복사한 텍스트 전체를 붙여넣어주세요."
              className={`${inputClass} w-full resize-y`}
            />
          </div>
          <button
            type="button"
            onClick={handleNaverAutoFill}
            disabled={!naverPastedText.trim()}
            className="mt-3 rounded-md border border-gold-500 px-5 py-2 text-sm font-bold text-gold-600 transition-colors hover:bg-gold-500/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            자동 채우기
          </button>
          {naverUncertainFields && naverUncertainFields.length > 0 && (
            <p className="mt-3 rounded-md border border-gold-500/30 bg-gold-500/10 px-3 py-2 text-sm text-navy-900">
              자동으로 확인하지 못한 항목: {naverUncertainFields.join(", ")} — 아래
              폼에서 직접 확인해주세요(기존 값이 있었다면 그대로 남아있습니다).
            </p>
          )}
        </section>
      )}

      <section className="rounded-xl border border-navy-900/10 p-6 sm:p-8">
        <h2 className="text-base font-bold text-navy-950">기본 단지정보</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="단지명 (필수)">
            <input
              value={values.name}
              onChange={(event) => update("name", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="주소">
            <input
              value={values.address}
              onChange={(event) => update("address", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="건축물 용도">
            <input
              value={values.propertyType}
              onChange={(event) => update("propertyType", event.target.value)}
              placeholder="예: 공동주택"
              className={inputClass}
            />
          </Field>
          <Field label="사용승인일">
            <input
              type="date"
              value={values.approvalDate}
              onChange={(event) => update("approvalDate", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="세대수">
            <input
              type="number"
              value={values.totalHouseholds}
              onChange={(event) => update("totalHouseholds", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="동수">
            <input
              type="number"
              value={values.buildings}
              onChange={(event) => update("buildings", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="최고층">
            <input
              type="number"
              value={values.maxFloor}
              onChange={(event) => update("maxFloor", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="시공사">
            <input
              value={values.builder}
              onChange={(event) => update("builder", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="난방">
            <input
              value={values.heating}
              onChange={(event) => update("heating", event.target.value)}
              placeholder="예: 지역난방 / 열병합"
              className={inputClass}
            />
          </Field>
          <Field label="복도식 구조">
            <input
              value={values.hallwayType}
              onChange={(event) => update("hallwayType", event.target.value)}
              placeholder="예: 계단식"
              className={inputClass}
            />
          </Field>
          <Field label="총 주차대수">
            <input
              type="number"
              value={values.parkingCount}
              onChange={(event) => update("parkingCount", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="세대당 주차대수">
            <input
              type="number"
              step="0.01"
              value={values.parkingPerHousehold}
              onChange={(event) => update("parkingPerHousehold", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="용적률(%)">
            <input
              type="number"
              step="0.1"
              value={values.floorAreaRatio}
              onChange={(event) => update("floorAreaRatio", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="건폐율(%)">
            <input
              type="number"
              step="0.1"
              value={values.buildingCoverageRatio}
              onChange={(event) =>
                update("buildingCoverageRatio", event.target.value)
              }
              className={inputClass}
            />
          </Field>
          <Field label="관리사무소 전화번호">
            <input value={values.managementOfficePhone} onChange={(event) => update("managementOfficePhone", event.target.value)} className={inputClass} />
          </Field>
          <Field label="관리비(원)">
            <input type="number" value={values.managementFeeWon} onChange={(event) => update("managementFeeWon", event.target.value)} className={inputClass} />
          </Field>
          <Field label="관리비 원문">
            <input value={values.managementFeeRaw} onChange={(event) => update("managementFeeRaw", event.target.value)} className={inputClass} />
          </Field>
          <Field label="관리비 기준연월" hint="YYYY-MM">
            <input type="month" value={values.managementFeeAsOf} onChange={(event) => update("managementFeeAsOf", event.target.value)} className={inputClass} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="특징 (쉼표로 구분)" hint="매물 상세페이지 단지 소개에 노출됩니다.">
            <textarea
              value={values.features}
              onChange={(event) => update("features", event.target.value)}
              rows={2}
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-navy-900/10 p-6 sm:p-8">
        <h2 className="text-base font-bold text-navy-950">AI 매물추천용 정보</h2>
        <p className="mt-1 text-xs text-navy-800/50">
          AI 매물추천이 실제로 점수 계산에 쓰는 필드입니다. 세대수·세대당
          주차대수는 위 기본정보에 입력한 값을 그대로 사용합니다.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="지하철역">
            <input
              value={values.subway}
              onChange={(event) => update("subway", event.target.value)}
              placeholder="예: 구래역"
              className={inputClass}
            />
          </Field>
          <Field label="지하철 도보시간(분)">
            <input
              type="number"
              value={values.subwayWalkMinutes}
              onChange={(event) => update("subwayWalkMinutes", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="지하철 설명(선택)">
            <input
              value={values.subwayDistance}
              onChange={(event) => update("subwayDistance", event.target.value)}
              placeholder="예: 약 500m, 도보 약 5분"
              className={inputClass}
            />
          </Field>
          <Field label="버스 (쉼표로 구분)">
            <input
              value={values.buses}
              onChange={(event) => update("buses", event.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="인근 학교 (쉼표로 구분)">
            <textarea
              value={values.nearbySchools}
              onChange={(event) => update("nearbySchools", event.target.value)}
              rows={2}
              placeholder="예: 김포호수초등학교, 한가람중학교"
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-navy-900/10 p-6 sm:p-8">
        <h2 className="text-base font-bold text-navy-950">MOLIT 실거래가 연동</h2>
        <p className="mt-1 text-xs text-navy-800/50">
          저장하기 전에 &quot;실거래 연결 확인&quot;으로 실제 국토교통부 API에서
          거래가 조회되는지 먼저 확인할 수 있습니다. 확인이 실패해도 저장은 그대로
          가능합니다(나중에 값을 고쳐 다시 확인하면 됩니다).
        </p>
        {values.molitAptSeq && (
          <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            MOLIT 단지코드 자동 선택: {values.molitAptSeq}
          </p>
        )}
        {molitSearchResolved && !values.molitAptSeq && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="지역코드 (lawdCode)">
              <input
                value={values.molitLawdCode}
                onChange={(event) => update("molitLawdCode", event.target.value)}
                placeholder="예: 41570"
                className={inputClass}
              />
            </Field>
            <Field label="단지코드 (aptSeq)">
              <input
                value={values.molitAptSeq}
                onChange={(event) => update("molitAptSeq", event.target.value)}
                placeholder="예: 41570-744"
                className={inputClass}
              />
            </Field>
          </div>
        )}
        <button
          type="button"
          onClick={handleMolitSearch}
          disabled={molitSearching}
          className="mt-4 rounded-md border border-gold-500 px-5 py-2 text-sm font-bold text-gold-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {molitSearching ? "검색 중..." : "단지 찾기"}
        </button>
        {molitSearchError && <p className="mt-3 text-sm text-red-600">{molitSearchError}</p>}
        {!values.molitAptSeq && molitComplexes.length > 10 && (
          <input
            value={molitNameFilter}
            onChange={(event) => setMolitNameFilter(event.target.value)}
            placeholder="단지명으로 결과 필터"
            className={`${inputClass} mt-3 w-full`}
          />
        )}
        {!values.molitAptSeq && molitComplexes.length > 0 && (
          <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {molitComplexes
              .filter((item) => item.aptNm.toLowerCase().includes(molitNameFilter.trim().toLowerCase()))
              .map((item) => (
                <li key={item.aptSeq}>
                  <button
                    type="button"
                    onClick={() => {
                      update("molitAptSeq", item.aptSeq);
                      setMolitSearchError("");
                    }}
                    className="w-full rounded-md border border-navy-900/10 px-3 py-2 text-left text-sm hover:border-gold-500"
                  >
                    <span className="font-semibold">{item.aptNm || "단지명 없음"}</span>
                    <span className="ml-2 text-xs text-navy-800/60">{item.aptSeq} · {item.tradeCount}건</span>
                  </button>
                </li>
              ))}
          </ul>
        )}
        <button
          type="button"
          onClick={handleMolitCheck}
          disabled={molitResult.status === "checking"}
          className="mt-4 rounded-md border border-navy-900/15 px-5 py-2 text-sm font-bold text-navy-800 transition-colors hover:border-gold-500 hover:text-gold-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {molitResult.status === "checking" ? "확인 중..." : "실거래 연결 확인"}
        </button>

        {molitResult.status === "error" && (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {molitResult.message}
          </p>
        )}
        {molitResult.status === "success" && (
          <div className="mt-3 rounded-md border border-navy-900/10 bg-navy-900/[0.02] px-4 py-3 text-sm">
            {molitResult.matchCount > 0 ? (
              <p className="font-semibold text-navy-900">
                최근 12개월, 이 단지코드로 실거래 {molitResult.matchCount}건이
                조회됩니다.
              </p>
            ) : (
              <p className="font-semibold text-navy-900">
                지역({values.molitLawdCode}) 내 실거래 {molitResult.totalTradesInRegion}
                건 중, 이 단지코드와 일치하는 거래는 없습니다. aptSeq를
                확인해주세요.
              </p>
            )}
            {molitResult.sample.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1 text-xs text-navy-800/70">
                {molitResult.sample.map((trade, index) => (
                  <li key={index}>
                    {trade.dealDate} · {trade.floor}층 · 전용{trade.exclusiveArea}㎡ ·{" "}
                    {trade.dealAmount.toLocaleString()}만원
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {errors.length > 0 && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          <ul className="list-disc space-y-0.5 pl-4">
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="self-start rounded-md bg-gradient-to-r from-gold-500 to-gold-600 px-6 py-2.5 text-sm font-bold text-navy-950 shadow-md shadow-gold-500/30 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "저장 중..." : submitLabel}
      </button>
    </form>
  );
}
