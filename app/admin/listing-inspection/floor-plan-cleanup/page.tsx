import Link from "next/link";
import { getFloorPlanCleanupRows } from "../../../lib/floorPlanCleanup";
import FloorPlanCleanupTable from "./FloorPlanCleanupTable";

export const dynamic = "force-dynamic";

export default async function FloorPlanCleanupPage() {
  const rows = await getFloorPlanCleanupRows();

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold tracking-wide text-gold-600">ADMIN</p>
        <Link
          href="/admin/listing-inspection"
          className="text-sm font-medium text-navy-800/60 underline-offset-4 hover:text-gold-600 hover:underline"
        >
          ← 점검 센터
        </Link>
      </div>
      <h1 className="mt-2 text-2xl font-black text-navy-950 sm:text-3xl">
        평면도 일괄 연결
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-navy-800/70">
        자동으로 연결하지 않습니다. 전용·공급면적이 둘 다 ±0.05㎡ 이내로
        일치하는 후보가 정확히 1개일 때만 미리 체크해두고, 후보가 여러 개거나
        없으면 직접 확인해야 합니다.
      </p>

      {rows.length === 0 ? (
        <p className="mt-8 rounded-xl border border-navy-900/10 px-6 py-16 text-center text-sm text-navy-800/60">
          평면도 연결이 필요한 아파트 매물이 없습니다.
        </p>
      ) : (
        <div className="mt-8">
          <FloorPlanCleanupTable rows={rows} />
        </div>
      )}
    </div>
  );
}
