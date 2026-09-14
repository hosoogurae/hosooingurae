# Vercel 함수 리전 변경 — 배포 전 기준값

`vercel.json`에 `regions: ["sin1"]`을 넣기 직전(2026-09-14, KST 기준
저녁), 변경 전(iad1) 상태로 운영 주소(https://hosoobudongsan.kr)를
`curl -w "%{time_total}"`로 5회씩 재서 남깁니다. 배포 후 같은 방식으로
다시 재서 이 표와 비교하면 됩니다.

**변경 전 X-Vercel-Id**: `icn1::iad1::...` (edge POP=icn1, 함수 리전=iad1 확인됨)

## 측정값 (초, time_total)

| 페이지 | #1 | #2 | #3 | #4 | #5 | 중앙값 |
|---|---|---|---|---|---|---|
| `/` | 3.54 | 2.01 | 2.11 | 1.45 | 1.99 | 2.01 |
| `/listings` | 1.58 | 1.77 | 1.45 | 1.44 | 1.54 | 1.54 |
| `/listings/[id]`(`4-2-000-mtioa003`) | 2.04 | 1.68 | 1.75 | 1.50 | 1.70 | 1.70 |
| `/notices` | 1.17 | 1.06 | 1.00 | 1.08 | 1.16 | 1.08 |
| `/sise` | 5.89 | 2.76 | 2.77 | 2.78 | 5.97 | 2.78 |

`/sise`와 `/`는 편차가 커서(간헐적 Gateway Timeout 재시도로 추정)
단순 평균보다 중앙값이 더 안정적인 비교 기준입니다.

## 배포 후 재측정 방법

```bash
# X-Vercel-Id로 실제 함수 리전이 바뀌었는지 먼저 확인
curl -s -D - -o /dev/null "https://hosoobudongsan.kr/notices" | grep -i "x-vercel-id"
# icn1::sin1::... 처럼 두 번째 구간이 sin1이면 정상 반영된 것

# 각 페이지 5회씩 재측정(위와 동일한 방식)
for p in "" "listings" "listings/4-2-000-mtioa003" "notices" "sise"; do
  echo "=== /$p ==="
  for i in 1 2 3 4 5; do
    curl -s -o /dev/null -w "%{time_total}s\n" "https://hosoobudongsan.kr/$p"
  done
done
```
