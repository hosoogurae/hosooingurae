export interface ParsedFloorPlanFileName {
  /** 문자가 섞인 세그먼트가 정확히 하나일 때만 채웁니다(평형 이름). 숫자만으로는 타입명을 만들지 않습니다. */
  typeName: string | null;
  /** 세그먼트들로부터 숫자 하나를 명확히 만들 수 있을 때만 채웁니다. */
  supplyArea: number | null;
}

const PURE_NUMBER = /^\d+(\.\d+)?$/;
const PURE_INTEGER = /^\d+$/;

function stripExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? fileName.slice(0, dot) : fileName;
}

/**
 * 평면도 파일명에서 평형 이름과 공급면적을 분리해서 읽습니다. "_"로 나눈
 * 세그먼트 중 숫자만인 것과 문자가 섞인 것을 구분해서, 애매하지 않을 때만
 * 값을 채웁니다 — 숫자를 타입명으로 쓰지 않고(평형 이름과 면적은 다른
 * 값입니다), 숫자 후보가 여럿이면 추측하지 않고 비워둡니다.
 *
 * 예: "131.65.jpg" → 면적 131.65, 타입명 없음
 *     "131_65.jpg" → 면적 131.65("_"를 소수점으로), 타입명 없음
 *     "109A_131.65.png" → 타입명 109A, 면적 131.65
 *     "84A.jpg" → 타입명 84A, 면적 없음(숫자가 없으니 못 읽음)
 */
export function parseFloorPlanFileName(fileName: string): ParsedFloorPlanFileName {
  const base = stripExtension(fileName).trim();
  const segments = base.split("_").map((segment) => segment.trim()).filter(Boolean);

  if (segments.length === 0) {
    return { typeName: null, supplyArea: null };
  }

  const numericSegments = segments.filter((segment) => PURE_NUMBER.test(segment));
  const nameSegments = segments.filter((segment) => !PURE_NUMBER.test(segment));

  const typeName = nameSegments.length === 1 ? nameSegments[0] : null;

  let supplyArea: number | null = null;
  if (
    numericSegments.length === 2 &&
    numericSegments.every((segment) => PURE_INTEGER.test(segment))
  ) {
    // "131_65" 처럼 순수 정수 두 개 — "_"를 소수점으로 본 하나의 숫자.
    supplyArea = Number(`${numericSegments[0]}.${numericSegments[1]}`);
  } else if (numericSegments.length === 1) {
    supplyArea = Number(numericSegments[0]);
  }

  return { typeName, supplyArea };
}
