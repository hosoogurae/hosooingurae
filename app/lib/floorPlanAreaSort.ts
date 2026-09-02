/**
 * 순수 함수만 모아둔 파일입니다 — app/lib/floorPlans.ts는 sharp(Node 전용
 * 이미지 처리 라이브러리)를 물고 있어 클라이언트 컴포넌트(app/admin/ListingFields.tsx)에서
 * 직접 import하면 안 됩니다. 이 파일은 그런 서버 전용 의존성이 전혀 없어
 * 클라이언트에서 안전하게 씁니다.
 */
export interface UnitTypeAreaCandidate {
  unitType: string;
  exclusiveArea?: number;
  supplyArea?: number;
}

/**
 * 평형 타입 후보를, 매물에 이미 입력된 전용/공급면적과 가까운 순으로
 * 정렬합니다(필터링이 아니라 정렬만 — 후보를 숨기지 않습니다). 전용·공급
 * 면적이 둘 다 있으면 두 차이의 평균으로, 하나만 있으면 그것만으로
 * 비교합니다. 비교할 면적이 아예 없는 후보(면적 미입력 상태)는 맨 뒤로
 * 밀리되 목록에서 빠지지는 않습니다. 동률이면 기존처럼 이름 가나다순입니다.
 */
export function sortUnitTypesByAreaSimilarity(
  candidates: UnitTypeAreaCandidate[],
  targetExclusiveArea: number | undefined,
  targetSupplyArea: number | undefined,
): UnitTypeAreaCandidate[] {
  function distance(candidate: UnitTypeAreaCandidate): number {
    const diffs: number[] = [];
    if (targetExclusiveArea !== undefined && candidate.exclusiveArea !== undefined) {
      diffs.push(Math.abs(candidate.exclusiveArea - targetExclusiveArea));
    }
    if (targetSupplyArea !== undefined && candidate.supplyArea !== undefined) {
      diffs.push(Math.abs(candidate.supplyArea - targetSupplyArea));
    }
    if (diffs.length === 0) return Infinity;
    return diffs.reduce((sum, diff) => sum + diff, 0) / diffs.length;
  }

  return [...candidates].sort((a, b) => {
    const distanceA = distance(a);
    const distanceB = distance(b);
    // 둘 다 Infinity(비교할 면적이 아예 없음)면 distanceA - distanceB가 NaN이 되어
    // sort 비교 결과가 정의되지 않으므로, 반드시 === 로 먼저 확인합니다.
    return distanceA !== distanceB
      ? distanceA - distanceB
      : a.unitType.localeCompare(b.unitType);
  });
}
