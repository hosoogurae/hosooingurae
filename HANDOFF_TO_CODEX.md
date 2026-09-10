# 호수공인중개사사무소 홈페이지 — Codex 인수인계 문서

작성일: 2026-09-10
작성자: Claude (Claude Code) — 실제 파일/Git/Supabase/Vercel 상태를 직접 조회해 작성했습니다.
이 문서 자체는 기능 코드를 건드리지 않고 현재 상태만 정리한 것입니다.

---

## 1. 프로젝트 기본 정보

### 목적
경기도 김포시 구래동 소재 부동산 중개사무소 "호수공인중개사사무소"의 실서비스 웹사이트.
데모가 아니라 실제 거래로 이어지는 상업 사이트입니다. 매물 소개, 시세(국토부 실거래가)
조회, 매물 추천, 관리자용 매물/단지/문의/문자 관리 기능을 제공합니다.

### 기술 스택과 주요 버전
- Next.js **16.2.10** (App Router, Turbopack 빌드) — `package.json`
  - ⚠️ 이 프로젝트의 Next.js는 최신 버전이라 예전 관례와 다른 점이 많습니다.
    수정 전 `node_modules/next/dist/docs/`의 관련 문서를 먼저 확인하라고
    `AGENTS.md`/`CLAUDE.md`에 명시돼 있습니다.
  - Next.js 16에서 미들웨어 파일명이 `middleware.ts`가 아니라 **`proxy.ts`**
    (프로젝트 루트)입니다. 인증 게이트가 여기 있습니다.
- React **19.2.4** / react-dom 19.2.4
- TypeScript **5.x** (strict, `tsconfig.json`)
- Tailwind CSS **4.x** (`@tailwindcss/postcss`, `globals.css`)
- Supabase (`@supabase/supabase-js` ^2.110.7) — Postgres + Storage
- vitest **4.1.10** (테스트), eslint **9** + `eslint-config-next`
- 기타: `sharp`(이미지 리사이즈), `fast-xml-parser`(국토부 API XML), `web-push`(푸시 알림),
  `recharts`(차트), `@huggingface/transformers`(브라우저 내 음성 인식 실험 기능)
- `tsx` ^4.23.1 devDependency — TS 스크립트를 바로 실행할 때 사용 가능(`node_modules/.bin/tsx`)

### 실행 방법
```bash
npm install
npm run dev      # http://localhost:3000
```
`.env.local`이 필요합니다(아래 7번 참고). 예시 파일: `.env.local.example`.

### 개발·빌드·검사 명령어 (`package.json`)
```bash
npm run dev     # next dev (Turbopack)
npm run build   # next build
npm run start   # next start (빌드 후 프로덕션 서버)
npm run lint    # eslint
npm run test    # vitest run
npm run gen:supabase-types  # Supabase 스키마 → app/lib/supabase/database.types.ts (실제로는 수기 관리 중, 아래 참고)
```
타입체크는 별도 스크립트가 없어 `npx tsc --noEmit`으로 직접 실행합니다.

### 배포 방식과 배포 대상
- **Vercel** 프로젝트: `hosooingurae` (team: `hosoogurae`, 팀 ID `team_rl0eM1MSGwLUZaZQUy8ONLFj`, plan: hobby)
- GitHub 저장소(`hosoogurae/hosooingurae`)의 `main` 브랜치에 push되면 **자동 배포**됩니다
  (Vercel↔GitHub 연동, 로컬에 `.vercel/` 링크 파일은 없음 — Vercel CLI도 로컬에 설치돼 있지 않음).
- 커스텀 도메인: **hosoobudongsan.kr** (정식 서비스 주소)
- `hosooingurae.vercel.app`(Vercel 기본 별칭)으로 들어오면 `next.config.ts`의
  `redirects()`가 308로 `hosoobudongsan.kr`로 영구 리다이렉트합니다(경로·쿼리 보존).
- 확인 결과 **최신 커밋(f90442f)이 이미 production에 배포되어 READY 상태**입니다
  (Vercel `list_deployments`로 직접 확인, 커밋 SHA 일치 확인).

### 현재 브랜치
`main` — `origin/main`과 완전히 동기화(ahead/behind 0/0), working tree clean
(단, `supabase/.temp/`는 Supabase CLI/MCP 도구가 만드는 로컬 캐시라 git 추적 대상이 아님).

### 최근 커밋 (최신순, `git log --oneline -10`)
```
f90442f feat: replace viewing-schedule template with visit confirmation
b89fad7 fix: translate unique-violation error for contract prep items
3c65abb feat: add special-contract prep items, hide empty checkboxes
d89db09 feat: rebuild contract-prep SMS as checklist-driven, not fixed templates
80f43a3 feat: allow deleting a listing directly from duplicate-suspect cards
07d0ce9 feat: redirect vercel.app production alias to hosoobudongsan.kr
70517a8 remove: redundant "[매물 문의]" copy block from listing detail
de71825 fix: outbound customer links always use NEXT_PUBLIC_SITE_URL
949efac feat: add contact picker to SMS compose (Android Chrome only)
58fda54 feat: add share button to listing detail page
```

### 원격 저장소 연결 상태
```
origin  https://github.com/hosoogurae/hosooingurae.git (fetch/push)
```
- `main`: 로컬 = 원격, 최신.
- **`wip/customers-consultations-2`**: 원격(`origin/wip/customers-consultations-2`)에도 push됨.
  main과 로컬도 동기화됨. **main에는 병합되지 않은 상태**(자세한 내용은 3-⑨, 4, 10번 참고).
- `wip/customers-consultations`: 로컬 전용(원격에 없음), 더 오래된 스냅샷. 건드리지 마세요.
- `preview/naver-new-layout`: 원격에 존재. 이번 조사에서 내용은 상세히 보지 않았습니다 — 착수 전 `git log main..origin/preview/naver-new-layout` 확인 권장.

---

## 2. 전체 구조

### 최상위
```
app/                Next.js App Router 루트
proxy.ts             인증 미들웨어 (Next.js 16의 middleware.ts 대체 파일명)
supabase/migrations/ SQL 마이그레이션(0001~0028, 0015는 main에 없음 — 3-⑨ 참고)
scripts/             관리자 비밀번호 해시 생성 스크립트 등
public/              정적 파일, PWA manifest(admin.webmanifest)
CLAUDE.md, AGENTS.md  프로젝트 규칙 (가격 출처, null 처리, 추천 로직, 금융정보 금지 등)
```

### `app/` 하위 주요 폴더
- `app/admin/` — 관리자 화면 (아래 상세)
- `app/api/` — Route Handler. 공개 API(`app/api/listings`, `app/api/complexes`,
  `app/api/transactions`, `app/api/contact-requests`, `app/api/listing-submissions`,
  `app/api/import-naver`)와 관리자 전용 `app/api/admin/*`로 나뉩니다.
- `app/data/` — Supabase에서 읽어온 원시 데이터를 앱 도메인 타입으로 변환하는 조회 함수들
  (예: `app/data/listings.ts`, `app/data/complexes.ts`, `app/data/contact.ts` = 사무소 고정 정보).
- `app/lib/` — 순수 로직/유틸/서버 전용 함수. UI 없음. `app/lib/__tests__/`에 vitest 테스트.
- `app/lib/supabase/` — Supabase 클라이언트 2종(`client.ts`: 공개용/관리자용),
  수기 관리 타입(`database.types.ts`), DB row ↔ 앱 타입 매퍼(`mappers.ts`).
- `app/components/` — 공개 페이지(홈/매물/시세 등)에서 쓰는 공용 UI 컴포넌트.
- `app/lib/format/` — "값이 없을 수 있는 필드"(층/면적/방수/관리비/주차) 전용 공용 포맷터
  (`listingFields.ts`) — **null을 0으로 폴백하지 않는 규칙의 핵심 파일**.
- `app/lib/recommend/` — `/recommend` 규칙 기반 추천 로직(`queryParser.ts` → `scoring.ts`).

### 관리자 페이지 구조
- 진입/인증: `app/admin/login/`, 세션 검증 `app/lib/adminAuth.ts`
  (환경변수 `ADMIN_USERNAME`/`ADMIN_PASSWORD_HASH`/`ADMIN_SESSION_SECRET` 기반, DB 없는
  서명 쿠키 세션). 인증 게이트는 라우트별이 아니라 **`proxy.ts`(프로젝트 루트)** 한 곳에서
  `/admin/*`, `/api/admin/*` 전체를 가로챕니다.
- 공통 레이아웃: `app/admin/layout.tsx` → `AdminChrome.tsx` → `AdminNav.tsx`(상단 고정 내비, 6개
  메뉴: 대시보드/매물/단지/문자/문의함/도구).
- 하위 그룹은 각자 `layout.tsx` + `AdminTabs.tsx`(공용 탭 바)로 탭 구조:
  - `app/admin/listings/` — 탭: 접수(`submissions/`) / 등록(`new/`) / 관리(`manage/`) /
    점검(`inspection/`, 중복·거래의심 배지)
  - `app/admin/sms/` — 탭: 문자 쓰기(`compose/`) / 양식 관리(`templates/`) /
    계약 준비물(`contract-prep/`)
  - `app/admin/tools/` — 탭: 광고문구(`ad-copy/`) / 상담 도우미(`consult-helper/`)
  - `app/admin/complexes/` — 단지 등록/수정(탭 없음, 목록+등록+수정)
  - `app/admin/contacts/` — 문의함(탭 없음)
- 대시보드: `app/admin/page.tsx`

### 매물 등록·수정 관련 구조
- 공용 폼 필드 컴포넌트: `app/admin/ListingFields.tsx` (신규/수정 화면이 함께 사용)
- 등록: `app/admin/listings/new/page.tsx` — 네이버 부동산 텍스트 붙여넣기 파싱
  (`app/lib/naverTextParser.ts`, `app/lib/naverImport.ts`) → 단지 매칭/신규단지 생성 →
  중복 후보 검사(`app/lib/naverDuplicate.ts`, 패널 `app/admin/NaverDuplicatePanel.tsx`) →
  저장.
- 수정: `app/admin/listings/[id]/edit/page.tsx`
- 접수함(손님이 직접 등록 요청): `app/admin/listings/submissions/page.tsx`,
  데이터 `app/data/listingSubmissions.ts`, `app/lib/listingSubmissions.ts`
- 관리 목록: `app/admin/listings/manage/page.tsx` (2줄 압축 행, 상태 드롭다운)
- 점검(중복 의심/거래가 의심): `app/admin/listings/inspection/page.tsx`,
  `app/admin/listings/DuplicateSuspectPanel.tsx`,
  로직 `app/lib/duplicateSuspectedMatch.ts`, `app/lib/suspectedTransactionMatch.ts`
- 사진: `app/admin/ListingPhotoManager.tsx`, 처리 로직
  `app/lib/listingPhotoImageProcessing.ts`, `app/lib/listingPhotos.ts`
- API: `app/api/listings/route.ts`(공개 GET + 관리자 POST/PATCH/DELETE는 `proxy.ts`가
  쓰기 메서드만 인증 요구 — "mixed public write path"), `app/api/listings/[id]/route.ts`,
  관리자 전용 `app/api/admin/listings/*`(통계, 중복/거래의심 조회, 대량 평면도 연결 등)
- DB 접근/매핑: `app/data/listings.ts`(조회), `app/lib/listings.ts`, `app/lib/supabase/mappers.ts`
  (row → 앱 타입, **null 폴백 금지 규칙이 특히 여기 적용됨**)

### 문자 기능 관련 페이지·컴포넌트·훅·API·DB (상세는 9번 참고)
- 페이지: `app/admin/sms/compose/page.tsx`(일반 문자 작성),
  `app/admin/sms/templates/page.tsx`(내 양식 CRUD),
  `app/admin/sms/contract-prep/page.tsx`(계약 준비물 문자 — 체크리스트 기반)
- 레이아웃/탭: `app/admin/sms/layout.tsx`
- 공용 순수 로직: `app/lib/smsTemplateText.ts`(기본 3종 양식 + `{토큰}` 치환),
  `app/lib/contractPrepSms.ts`(계약 준비물 문장 생성 — 요일/오전오후 계산 포함),
  `app/lib/listingInquiry.ts`(매물 문의 문자 본문), `app/lib/phoneNormalize.ts`
- "내 양식"(DB 저장) 로직: `app/lib/smsTemplates.ts` (테이블 `admin_sms_templates`)
- 계약 준비물 항목 로직: `app/lib/contractPrepItems.ts` (테이블 `contract_prep_items`)
- API: `app/api/admin/sms-templates/` (내 양식 CRUD),
  `app/api/admin/contract-prep-items/` (계약 준비물 항목 CRUD)
- 연락처 선택: `app/admin/ContactPickerButton.tsx` (Android Chrome 전용, Contact Picker API)
- 공유 매물 링크 등 문의 관련 컴포넌트: `app/components/ContactActions.tsx`,
  `app/components/InquirySmsButton.tsx`, `app/components/ShareButton.tsx`
- 훅에 해당하는 것은 없음 — 이 기능은 커스텀 훅 없이 각 페이지 컴포넌트 안에서
  `useState`/`useMemo`/`useEffect`로 직접 상태를 관리합니다(아래 "상태 관리 방식" 참고).

### Supabase 및 외부 API 연동 구조
- Supabase 클라이언트: `app/lib/supabase/client.ts`
  - `getSupabaseClient()` — 공개 읽기용(publishable/anon key, RLS 적용)
  - `getSupabaseAdminClient()` — 관리자 전용(secret/service_role key, RLS 우회, 서버 전용,
    브라우저에서 호출 시 throw)
- 타입: `app/lib/supabase/database.types.ts` — **`npm run gen:supabase-types`로 자동 생성 가능한
  스크립트는 있지만, 이번 세션 기준으로는 사람이 직접 수정하며 관리해왔습니다**
  (마이그레이션 적용 후 수기로 타입 갱신). 재생성 시 diff를 꼭 확인하세요.
- 국토교통부 실거래가 API: `app/lib/molit.ts`(XML 파싱), `app/lib/molitComplexMatch.ts`,
  API 라우트 `app/api/transactions/route.ts`, `app/api/admin/molit-check/`,
  `app/api/admin/molit-complex-search/`. 환경변수 `MOLIT_API_KEY` 필요.
- 웹 푸시: `app/lib/push.ts`(발송), `app/lib/pushSubscriptions.ts`(구독 저장),
  `app/lib/pushClient.ts`(브라우저 구독), 환경변수 `NEXT_PUBLIC_VAPID_PUBLIC_KEY`/
  `VAPID_PRIVATE_KEY`/`VAPID_SUBJECT`.
- 상담 도우미(AI): `app/admin/tools/consult-helper/` — OpenAI Realtime API 음성 전사.
  `useOpenAiRealtimeTranscription.ts`, API `app/api/admin/consult-helper/realtime-token/`,
  환경변수 `OPENAI_API_KEY`. **CLAUDE.md 규칙: 여기 LLM은 사실 판단을 하지 않고 문장만
  정리하는 역할로 제한**.
  - `app/admin/consult-helper-experimental/`는 브라우저 내(WebGPU/transformers.js) 음성인식
    실험 버전으로 보이며, **어디서도 링크되지 않는 고아 페이지**입니다(grep 결과 자기 자신 외
    참조 없음) — 실제 사용 여부를 Codex가 사용자에게 확인 필요.

### 공통 컴포넌트와 상태 관리 방식
- **전역 상태 관리 라이브러리 없음** — Redux/Zustand/Jotai/Context API 전부 미사용
  (`app` 디렉터리 내 `createContext`/`useContext`/`from "redux"` 등 검색 결과 0건).
- 모든 상태는 컴포넌트 로컬 `useState`/`useMemo`이고, 서버 데이터는 각 컴포넌트가
  `useEffect` 안에서 `fetch()`로 직접 불러옵니다(예: `AdminNav.tsx`와
  `admin/listings/layout.tsx`가 같은 "거래의심 배지" API를 각자 독립적으로 호출 —
  의도된 관례로 주석에 명시돼 있음).
- 브라우저 API 의존 상태(모바일 여부, Contact Picker 지원 여부, 매물 비교 선택 등)는
  `useSyncExternalStore` 패턴을 공통으로 씁니다 — SSR 하이드레이션 불일치를 피하고
  `react-hooks/set-state-in-effect` eslint 규칙(이 프로젝트에서 error로 설정)을 지키기 위함.
  예: `app/lib/compareSelection.ts`, `app/components/ContactActions.tsx`의 `isMobileDevice`.
- "자동 생성값 vs 사람이 직접 고친 값" 상태는 `null = 아직 손대지 않음(자동값 사용)`
  패턴을 반복적으로 씁니다 — 예: `contract-prep/page.tsx`의 `manualBody`, `checkedIds`,
  `specialCheckedByType[type]`. 한 번이라도 사람이 고치면 그 뒤로 자동 재계산이
  값을 덮어쓰지 않습니다.

---

## 3. 지금까지 완료한 작업

최근 커밋 로그와 실제 코드를 직접 확인해 정리했습니다(오래된 기능까지 전부 나열하지 않고,
최근 세션에서 다룬 것 위주로 최신순 기재).

### ① 계약 준비물 문자 — 체크리스트 기반으로 전면 개편 (완료, 배포됨)
- **구현한 기능**: `/admin/sms/contract-prep` 화면을 "역할별 고정 문구"에서
  "역할별 준비물 목록 중 체크한 것만 반영해 문장을 자동 생성"하는 방식으로 재구축.
  공동명의·대리계약·법인계약 특수계약 옵션 추가, 항목 관리(추가/수정/삭제/순서변경/
  기본체크 설정) 내장.
- **관련 파일**: `app/lib/contractPrepItems.ts`, `app/lib/contractPrepSms.ts`,
  `app/admin/sms/contract-prep/page.tsx`, `app/api/admin/contract-prep-items/route.ts`,
  `app/api/admin/contract-prep-items/[id]/route.ts`,
  `supabase/migrations/0026_contract_prep_items.sql`,
  `0027_contract_prep_items_v2.sql`, `0028_contract_prep_special_items.sql`
- **구현 방식**: `contract_prep_items` 테이블 하나를 공통역할(매수인/매도인/임차인/임대인)과
  특수계약(공동명의/대리계약/법인계약) 항목 모두에 재사용(role 값 공간만 확장).
  항목마다 `default_checked`로 "기본 체크 여부"를 관리자가 직접 설정. 문장 생성은
  `buildContractPrepSms` 순수 함수가 담당하고, "신분증/도장"은 지참 문장에 자연스럽게
  녹이고 "계약금/계좌이체 한도 확인/계약금을 수령할 본인 명의 계좌번호" 3개 라벨만
  문자열 일치로 특수 취급, 그 외는 "추가 준비물: ..."로 별도 표시. 날짜/시간은
  `formatContractDateKorean`/`formatContractTimeKorean`이 요일·오전오후를 직접 계산
  (상대 표현 "내일" 등을 쓰지 않음).
- **DB 변경 여부**: 있음. 0026(신설)→0027(스키마 확장+기존 오염 데이터 정리)→0028
  (특수계약 14개 항목 추가 + `(role,label)` unique 제약). **모두 Supabase 프로덕션에
  실제 적용 완료** (`list_migrations`로 확인: `contract_prep_items`,
  `contract_prep_items_v2`, `contract_prep_special_items` 3건 모두 기록됨).
- **테스트/확인 여부**: `app/lib/__tests__/contractPrepSms.test.ts`(37개),
  `app/lib/__tests__/contractPrepItems.test.ts`(4개, unique 위반 메시지 번역).
  항목 관리 CRUD(추가/수정/순서변경/삭제)는 실제 lib 함수를 tsx 스크립트로
  프로덕션 DB에 대해 직접 실행해 검증(테스트 데이터는 원상복구 확인 후 삭제) —
  단, **브라우저로 화면을 직접 열어 눈으로 확인하지는 않았습니다**(관리자 로그인
  비밀번호를 Claude가 갖고 있지 않음).
- **배포 여부**: 배포됨(dpl_Bv8Q4xrJxJCbT84NVtibjWPdo8ab 등, production, READY).

### ② 계약 준비물 unique 제약 위반 에러 메시지 번역 (완료, 배포됨)
- **구현한 기능**: `(role,label)` unique 제약(23505) 위반 시 "항목 저장에 실패했습니다"
  대신 "같은 이름의 준비물이 이미 있습니다."로 안내. 기존 23503(FK 위반) 번역과
  동일한 패턴.
- **관련 파일**: `app/lib/contractPrepItems.ts`(`createContractPrepItem`/
  `updateContractPrepItem`), 테스트 `app/lib/__tests__/contractPrepItems.test.ts`
- **DB 변경**: 없음(0028의 unique 제약을 활용만 함).
- **테스트**: vitest 4건(23505 케이스 2개 + 그 외 에러 케이스 2개). tsc/eslint/vitest/build 통과.
- **배포**: 배포됨(dpl_GFgKteGvvBgu4wgYXRg9kSHogtZq).

### ③ 문자 양식 — "집 보기 일정 안내" 삭제, "방문 일정 확인"으로 교체 (완료, 배포됨)
- **구현한 기능**: 일정 조율은 전화로 하기로 결정되어 "집 보기 일정 안내"(날짜를
  문자로 묻는 양식) 삭제. 확정된 방문을 확인하는 "방문 일정 확인" 양식 추가.
  `/admin/sms/compose` 화면에 "방문 날짜/시간" 입력칸을 추가해, 고르면 본문의
  `{날짜}`/`{시간}` 자리에 "9월 11일(금)"/"오후 3시" 형태로 자동 반영.
- **관련 파일**: `app/lib/smsTemplateText.ts`(양식 목록, `{날짜}`/`{시간}` 토큰 추가),
  `app/admin/sms/compose/page.tsx`(날짜/시간 picker, `formatContractDateKorean`/
  `formatContractTimeKorean`을 `app/lib/contractPrepSms.ts`에서 재사용 — 계산 로직
  중복 안 만듦)
- **DB 변경**: 없음(정적 양식 배열 수정만).
- **테스트/확인**: tsc/eslint/vitest(350개) 통과. tsx 스크립트로 실제 문장을 생성해
  결과 확인(예문: "안녕하세요. 호수공인중개사사무소입니다. / 9월 11일(금) 오후 3시경
  방문 예정으로 확인차 연락드립니다. / 일정에 변동이 있으시면 연락 부탁드립니다. /
  문의: 031-998-4556"). 브라우저 실제 클릭 확인은 안 함(로그인 필요).
- **배포**: 배포됨(dpl_8jXgivUc3zsPh4E8ohYzhy8kfarg, 최신 production).

### ④ 매물 삭제 — 중복 의심 카드에서 바로 삭제 (완료, 배포됨, 이전 세션)
- 관련 파일: `app/admin/listings/DuplicateSuspectPanel.tsx`, `app/lib/duplicateSuspectedMatch.ts`
- DB 변경 없음(기존 DELETE API 재사용). 테스트: `removeListingFromGroups` 순수함수 5케이스.

### ⑤ vercel.app → hosoobudongsan.kr 프로덕션 리다이렉트 (완료, 배포됨, 이전 세션)
- 관련 파일: `next.config.ts`. 로컬 `next build && next start`로 Host 헤더 바꿔가며 직접 검증.

### ⑥ 매물 문의 링크 도메인 출처 통일 (완료, 배포됨, 이전 세션)
- `app/lib/requestUrl.ts` 삭제 → `app/lib/siteUrl.ts`(`buildSiteUrl`, `NEXT_PUBLIC_SITE_URL` 고정 사용)로 교체.

### ⑦ 문자 작성 화면 연락처 선택 (완료, 배포됨, 이전 세션)
- `app/admin/ContactPickerButton.tsx` — Android Chrome 전용 Contact Picker API.
  `app/lib/phoneNormalize.ts` 순수함수 13케이스 테스트.

### ⑧ 매물 상세 공유 버튼 (완료, 배포됨, 이전 세션)
- `app/components/ShareButton.tsx` — Web Share API + 클립보드 폴백.

### ⑨ 고객 CRM/상담 기록 기능 — **미완료, main 미병합** (별도 브랜치에만 존재)
- **구현한 기능(WIP)**: 고객 목록/상세, 상담 기록, 상담 태스크 CRUD.
- **관련 파일(브랜치 `wip/customers-consultations-2`에만 존재)**:
  `app/data/customers.ts`, `app/data/consultations.ts`, `app/lib/customers.ts`,
  `app/lib/consultations.ts`, `app/api/admin/customers/`, `app/api/admin/consultations/`,
  `app/api/admin/consultation-tasks/`, `app/lib/__tests__/customers.test.ts`,
  `app/lib/__tests__/consultations.test.ts`,
  `supabase/migrations/0015_customers_consultations.sql`(번호 재배정 필요 — 파일 상단에
  메모 있음), `app/lib/supabase/database.types.ts`/`mappers.ts`의 관련 타입 확장분,
  `scripts/generate-admin-password-hash.mjs`(이 기능과 무관하지만 같은 시점 미커밋
  변경이라 함께 보존됨).
- **DB 변경 여부**: 마이그레이션 파일은 작성됐으나 **Supabase 프로덕션에 적용되지
  않았습니다**(`list_tables`로 확인 — `customers`/`consultations`/`consultation_tasks`
  테이블 없음).
- **테스트/확인 여부**: 브랜치 내 vitest 테스트 파일은 있으나, main 기준으로는
  실행/검증 대상이 아님(4번, 10번 참고).
- **배포 여부**: 배포 안 됨. main에 없으므로 production 빌드에도 없음.
- 상세 배경은 `git log -1 wip/customers-consultations-2`의 커밋 메시지에 기록돼 있습니다.

---

## 4. 현재 작업 중인 부분

### 완료된 기능 (프로덕션에 있음)
- 공개 사이트: 홈/매물목록/매물상세/시세/매물비교/매물추천/판매(셀러)/개인정보처리방침
- 관리자: 로그인, 대시보드, 매물 접수/등록/관리/점검, 단지 관리, 문자(작성/양식/계약준비물),
  문의함, 도구(광고문구/상담도우미), 푸시 알림 토글, PWA 설치

### 미완료 / 임시 / TODO
1. **고객 CRM/상담 기록**(3-⑨) — 코드는 브랜치에 있지만 main 미병합, DB 미적용.
   재개 시 마이그레이션 번호를 0029 이후로 재배정 필요(현재 main 마지막 번호는 0028).
2. **`app/admin/consult-helper-experimental/`** — 어디서도 링크되지 않는 고아 페이지.
   실사용 여부 확인 필요(방치된 실험 코드로 보임).
3. **`.env.local.example`의 `NEXT_PUBLIC_OFFICE_PHONE` 설명이 실제 코드와 다름** —
   실제로는 `app/data/contact.ts`의 `PHONE_NUMBER`를 직접 쓰고(`{부동산전화번호}` 토큰),
   `NEXT_PUBLIC_OFFICE_PHONE` 환경변수는 코드 어디서도 사용되지 않습니다
   (커밋 `bf31f666`에서 제거됨). `.env.local.example` 문서만 갱신이 안 된 상태 —
   실제 `.env.local`에도 이 값은 없습니다.
4. **알려진 오류**: 이번 조사 범위에서 tsc/eslint/vitest/build 전부 통과(12번 참고),
   런타임 에러는 발견되지 않았습니다. 단, Claude는 관리자 로그인 비밀번호가 없어
   **브라우저로 관리자 화면을 열어 직접 눈으로 확인한 적이 없습니다** — 화면 렌더링/
   클릭 동작 자체의 버그는 상주 여부를 코드 리뷰로만 판단했습니다.
5. **Supabase 보안 어드바이저(INFO/WARN, 문제라기보다 설계 의도)**:
   - `admin_sms_templates`, `contact_requests`, `contract_prep_items`,
     `listing_submission_images`, `listing_submissions`,
     `listing_suspected_match_events`, `push_subscriptions` 7개 테이블은
     RLS는 켜져 있지만 정책이 하나도 없음 — **의도된 설계**(service_role 전용 접근,
     CLAUDE.md 명시 원칙)입니다. 새로 만지는 사람이 "정책 없음 = 버그"로 오인해
     공개 read 정책을 임의로 추가하지 않도록 주의.
   - `public.set_updated_at` 함수가 `search_path`를 고정하지 않음(WARN) — 오래전부터
     있던 항목으로 이번 세션에서 만든 문제가 아님, 필요시 별도로 고칠 것.
6. **README.md는 `create-next-app` 기본 템플릿 그대로**이고 프로젝트 설명이 없습니다.
   실제 프로젝트 설명·규칙은 `CLAUDE.md`/`AGENTS.md`에 있습니다.

---

## 5. Git 작업 상태

- **현재 브랜치**: `main`
- **최근 커밋**: 위 1번 섹션 참고 (최신: `f90442f`)
- **커밋되지 않은 변경 파일**: 없음(`git status` clean, `supabase/.temp/`만 untracked —
  이건 Supabase MCP/CLI 도구가 만드는 로컬 캐시 디렉터리로 프로젝트 산출물이 아닙니다.
  `.gitignore`에 없다면 추가를 검토할 수 있지만, 이번 문서 작업 범위(코드 미수정)를
  지키기 위해 손대지 않았습니다).
- **새로 생성된 파일**: 이번 세션에서 커밋된 것 — `app/lib/__tests__/contractPrepItems.test.ts`,
  `supabase/migrations/0028_contract_prep_special_items.sql` 등(1번 커밋 로그 참고).
  이 문서(`HANDOFF_TO_CODEX.md`) 자체는 **아직 커밋 전**입니다.
- **변경 파일별 수정 목적**: 3번 섹션에 파일별로 기재.
- **원격 저장소 push 여부**: main의 모든 커밋 push 완료. `wip/customers-consultations-2`도
  push됨. `wip/customers-consultations`는 로컬에만 있음.
- **현재 배포본에 반영되었는지 여부**: main의 모든 커밋(f90442f까지) production에
  배포·반영됨(Vercel 확인 완료). `wip/*` 브랜치 내용은 배포되지 않음(main에 없으므로).

⚠️ **커밋되지 않은 다른 작업자의 변경은 절대 삭제/되돌리지 않았습니다.** 이 저장소는
Claude 외 다른 AI 도구(Codex 등)도 작업하는 저장소이므로, `git reset`/`git checkout --`/
강제 push 등 파괴적 명령은 이번 조사에서 전혀 사용하지 않았습니다(읽기 전용 git 명령만
사용).

---

## 6. 데이터베이스

Supabase 프로젝트 ID: `rmdhirfybsmvhlapbrin` (연결 정보는 환경변수로만 참조, 7번 참고)

### 현재 사용 중인 테이블 (public 스키마, `list_tables`로 직접 확인, 전부 RLS enabled)
| 테이블 | 대략적 용도 | 행 수(확인 시점) |
|---|---|---|
| `complexes` | 아파트/오피스텔 단지 정보 | 17 |
| `listings` | 매물 | 117 |
| `listing_images` | 매물 사진 | 0 |
| `floor_plan_images` | 평면도 이미지 | 36 |
| `listing_submissions` | 손님이 직접 접수한 매물 등록 요청 | 2 |
| `listing_submission_images` | 위 접수건 첨부 사진 | 2 |
| `complex_images` | 단지 사진 | 16 |
| `unit_type_images` | 평형별 사진 | 4 |
| `admin_sms_templates` | 관리자 "내 문자양식"(0013) | 0 |
| `contact_requests` | 홈페이지 문의 접수 | 2 |
| `push_subscriptions` | 웹푸시 구독 정보 | 1 |
| `listing_suspected_match_events` | 거래의심 확인 이력 | 89 |
| `contract_prep_items` | 계약 준비물 문자용 체크리스트 항목(0026~0028) | 22 |

`customers`/`consultations`/`consultation_tasks` 테이블은 **아직 없습니다**
(브랜치 전용 마이그레이션 0015가 main에 없어 미적용, 3-⑨ 참고).

### 주요 컬럼 / 관계
- 상세 컬럼은 `app/lib/supabase/database.types.ts`가 최신 소스입니다(수기 관리 —
  스키마를 바꾸면 이 파일도 같이 갱신해야 함, `gen:supabase-types` 스크립트로 재생성 가능하나
  이번 세션엔 수기로 갱신).
- `listings.complex_id` → `complexes.id` (ON DELETE RESTRICT, 0024에서 추가 — 매물이 있는
  단지는 삭제 불가, 위반 시 23503을 사람이 읽을 메시지로 번역해서 보여줌, `app/lib/complexes.ts`).
- `contract_prep_items`: `role`(공통/매수인/매도인/임차인/임대인/공동명의/대리계약/법인계약
  CHECK 제약), `label`, `sort_order`, `default_checked`, `(role,label)` UNIQUE(0028).

### 적용된 마이그레이션
`supabase/migrations/0001_init.sql` ~ `0028_contract_prep_special_items.sql`
(단, **0015는 main 브랜치에 없음** — 파일 목록이 0014 다음 0016으로 건너뜀. 0015는
`wip/customers-consultations-2` 브랜치 전용).

Supabase의 자체 마이그레이션 이력 테이블(`list_migrations`)에는 다음 6건만 기록돼
있습니다: `complexes_name_unique`, `listings_complex_id_restrict_delete`,
`complex_property_type_check`, `contract_prep_items`, `contract_prep_items_v2`,
`contract_prep_special_items`. **그 이전(0001~0022 등)은 Supabase 대시보드 SQL Editor로
수동 적용되어 이력 테이블에 안 남아있을 뿐, 실제 스키마에는 반영돼 있습니다** —
`list_tables`로 직접 대조해 확인했습니다. 즉 "이력 테이블에 없다"가 "적용 안 됨"을
의미하지 않으니 혼동하지 마세요.

### 아직 적용하지 않은 마이그레이션
- `0015_customers_consultations.sql` — `wip/customers-consultations-2` 브랜치에만 존재,
  main에 병합되지 않아 미적용. 재개 시 번호를 0029 이후로 재배정 필요(파일 상단에
  작성자가 남긴 메모 있음).

### RLS / 권한 설정
- 공개 SELECT 정책이 있는 테이블(손님이 보는 데이터): `complexes`, `listings`,
  `listing_images`, `floor_plan_images`, `complex_images`, `unit_type_images` — 전부
  `"... are publicly readable"` 이름의 SELECT 정책 하나씩만 존재.
- 나머지 7개 테이블(`admin_sms_templates`, `contact_requests`, `contract_prep_items`,
  `listing_submission_images`, `listing_submissions`, `listing_suspected_match_events`,
  `push_subscriptions`)은 RLS는 켜져 있지만 **정책이 하나도 없음 → service_role
  키로만 접근 가능**(의도된 설계, CLAUDE.md 원칙: "RLS 정책을 임의로 완화하지 않는다").
- 쓰기(INSERT/UPDATE/DELETE)는 모든 공개 테이블에서도 정책이 없어 기본 차단 —
  관리자 API(`app/api/admin/*`)가 `getSupabaseAdminClient()`(secret key)로만 씁니다.

### 문자 기능과 연결된 테이블
- `contract_prep_items` — 위 표 참고. `app/lib/contractPrepItems.ts`가 유일한 접근 경로.
- `admin_sms_templates` — "내 양식" 저장용. `app/lib/smsTemplates.ts`가 유일한 접근 경로.
- 기본 3종 양식(기본 안내/방문 일정 확인/상담 후 안내)은 **DB가 아니라 코드**
  (`app/lib/smsTemplateText.ts`의 `DEFAULT_SMS_TEMPLATES` 배열)에 있습니다 — 관리자가
  화면에서 수정할 수 없고, 코드 수정이 필요합니다(계약 준비물 항목과는 다른 방식이니
  혼동 주의).

---

## 7. 환경변수와 외부 서비스

`.env.local`에 실제로 설정된 변수 이름만 나열합니다(**값은 절대 기재하지 않음**).
전체 설명은 `.env.local.example` 참고(단, 6-③에서 지적한 대로 일부 설명이 stale함).

| 변수 | 용도 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 공개 읽기용 Supabase 키(RLS 적용) |
| `SUPABASE_SECRET_KEY` | 관리자 전용 Supabase 키(RLS 우회) — 서버 전용, 절대 클라이언트 노출 금지 |
| `MOLIT_API_KEY` | 국토교통부 실거래가 공개시스템 API 키 |
| `NEXT_PUBLIC_SITE_URL` | 손님에게 나가는 링크(문자/공유/광고문구)의 canonical 도메인 |
| `NEXT_PUBLIC_INQUIRY_MOBILE` | 매물 상세 "문자로 문의" 버튼 수신 번호(없으면 버튼 숨김) |
| `ADMIN_USERNAME` | 관리자 로그인 아이디 |
| `ADMIN_PASSWORD_HASH` | 관리자 로그인 비밀번호 해시(`scripts/generate-admin-password-hash.mjs`로 생성) |
| `ADMIN_SESSION_SECRET` | 관리자 세션 쿠키 서명 키 |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | 웹푸시(VAPID) |
| `OPENAI_API_KEY` | 상담 도우미(음성 전사) Realtime API |

`.env.local.example`에는 있지만 **현재 `.env.local`에는 없고 코드에서도 안 쓰이는 것**:
- `NEXT_PUBLIC_KAKAO_CHANNEL_URL` — 카카오톡 채널 버튼용이나 미설정(카카오톡 상담 안 씀,
  커밋 로그상 "카카오톡은 안 쓰기로 했다"는 기록 있음). 코드(`ContactActions.tsx`)는
  값이 없으면 버튼을 자동으로 숨기므로 문제 없음.
- `NEXT_PUBLIC_OFFICE_PHONE` — 4-③ 참고, 완전히 제거된 죽은 설명.

### Vercel 설정 여부
Vercel 프로젝트(`hosooingurae`)에 동일한 이름의 환경변수가 설정되어 있어야 프로덕션이
동작합니다(로컬 `.env.local`과 별개로 Vercel 대시보드에서 관리). 이번 조사에서 Vercel
쪽 환경변수 목록 자체는 조회하지 않았습니다(값 노출 우려 없이 이름만 조회하는 MCP
도구가 마련돼 있지 않아 생략) — 필요시 Vercel 대시보드에서 직접 확인 권장.

### Supabase 설정 여부
프로젝트 연결 확인됨(`rmdhirfybsmvhlapbrin`), 로컬에는 Supabase CLI 링크 파일
(`supabase/config.toml` 등)이 없어 **CLI가 아니라 대시보드 SQL Editor 또는 MCP 도구로
직접 마이그레이션을 적용하는 방식**입니다(`CLAUDE.md`에 "요청받지 않는 한 새로 만들지
않는다"고 명시).

### 문자 발송 서비스 연결 방식
**실제 발송 API 연동 없음.** `sms:` 스킴 링크(`buildSmsHref`, `app/lib/listingInquiry.ts`)를
열어 **휴대폰의 기본 문자 앱**을 띄우는 방식입니다 — 서버에서 자동 발송하지 않고,
관리자가 문자 앱에서 직접 "전송" 버튼을 눌러야 실제로 나갑니다(9번에서 상세).

### 국토교통부 실거래가 API 연동 현황
연동돼 있음(`app/lib/molit.ts`). `MOLIT_API_KEY` 환경변수 필요, XML 응답을
`fast-xml-parser`로 파싱. 매물 상세의 "실거래가" 차트(`app/components/TransactionPriceChart.tsx`),
단지 매칭(`molitComplexMatch.ts`), 거래의심 판정(`suspectedTransactionMatch.ts`)에 사용.

---

## 8. 호수공인중개사 고정 정보

**전부 `app/data/contact.ts` 한 파일에서 상수로 관리됩니다(하드코딩 아님, 단일 출처).**

```ts
// app/data/contact.ts
export const COMPANY_NAME = "호수공인중개사사무소";
export const CEO_NAME = "김병수";
export const BUSINESS_REG_NUMBER = "210-15-47590";
export const BROKERAGE_REG_NUMBER = "3652-3625";
export const PHONE_NUMBER = "031-998-4556";
export const PHONE_HREF = "tel:0319984556";
export const ADDRESS_LINES = [
  "경기도 김포시 김포한강5로 385, 상가동 108호",
  "(구래동, 호수마을자연앤이편한세상아파트)",
];
export const BUSINESS_HOURS = "월~토 10:00 ~ 18:00";
export const WEEKLY_CLOSED_LABEL = "매주 일요일";
export const NAVER_MAP_URL = "https://naver.me/5DDixBuS";
export const PRIVACY_OFFICER_EMAIL = "bskimbt@naver.com";
```

이 값들을 쓰는 주요 파일: `app/components/Footer.tsx`, `app/components/BrokerageInfo.tsx`
(매물 상세 페이지의 중개대상물 표시 의무 정보 블록, CLAUDE.md 7번 규칙에 따라 제거 금지),
`app/lib/smsTemplateText.ts`(`{사무소명}`/`{사무소주소}`/`{부동산전화번호}` 토큰),
`app/lib/contractPrepSms.ts`. **주소·전화번호를 바꿔야 한다면 이 파일 하나만 고치면
전체 사이트에 반영됩니다.**

---

## 9. 문자 기능의 현재 상태

### 정확한 파일 경로
- 페이지: `app/admin/sms/compose/page.tsx`(일반 문자), `app/admin/sms/templates/page.tsx`
  (내 양식 관리), `app/admin/sms/contract-prep/page.tsx`(계약 준비물 문자)
- 레이아웃: `app/admin/sms/layout.tsx`
- 순수 로직: `app/lib/smsTemplateText.ts`, `app/lib/contractPrepSms.ts`,
  `app/lib/contractPrepItems.ts`, `app/lib/smsTemplates.ts`, `app/lib/listingInquiry.ts`,
  `app/lib/phoneNormalize.ts`
- API: `app/api/admin/sms-templates/route.ts`, `app/api/admin/sms-templates/[id]/route.ts`,
  `app/api/admin/contract-prep-items/route.ts`, `app/api/admin/contract-prep-items/[id]/route.ts`
- DB: `contract_prep_items`(계약 준비물 항목), `admin_sms_templates`(내 양식) — 6번 참고
- 훅: 없음(커스텀 훅 없이 페이지 컴포넌트 내부 상태로 처리)

### 역할 선택 기능의 현재 구현
`contract-prep/page.tsx`에서 매수인/매도인/임차인/임대인 4버튼 그리드(`ROLES` =
`CONTRACT_PREP_ROLES`, `app/lib/contractPrepItems.ts`)로 선택. 역할을 바꾸면
`checkedIds`가 `null`로 리셋되어(=아직 손대지 않음) 새 역할의 `default_checked` 값을
그대로 반영합니다. 역할에 따라 "매매계약"/"임대차계약" 라벨이 자동으로 바뀝니다
(`getContractTypeLabel`).

### 매수인·매도인·임차인·임대인 준비물 데이터 위치
**전부 DB(`contract_prep_items` 테이블)에만 있고 코드에 하드코딩된 목록이 없습니다.**
화면은 "공통" role + 선택한 role의 항목을 라벨 기준 중복 제거해서 보여줍니다
(`visibleItems`, `dedupeByLabel`). 항목 관리 UI(`ItemManager` 컴포넌트, 같은 파일 내)로
추가/수정/삭제/순서변경(`handleMove`, 인접 항목과 `sort_order` 맞교환)·`default_checked`
토글이 전부 가능하며, `app/api/admin/contract-prep-items/*` → `app/lib/contractPrepItems.ts`
→ Supabase 순으로 바로 반영됩니다(코드 재배포 불필요).

### 준비물 체크 시 문자 생성 방식
체크된 항목의 `label` 배열을 `buildContractPrepSms()`(`app/lib/contractPrepSms.ts`)에
넘기면:
1. "신분증"/"도장"은 항상 "~을/를 지참해 주세요" 문장에 자연스럽게 합쳐짐.
2. "계약금"은 송금 역할(매수인/임차인)에서 "계좌이체 한도 확인"과 같이 체크되면 한 문장으로
   합쳐지고, 아니면 신분증/도장과 같은 일반 지참 항목으로 남음.
3. 수령 역할(매도인/임대인)에서 "계약금을 수령할 본인 명의 계좌번호"가 체크되면
   해당 문장이 붙음.
4. 그 외 모든 체크 항목(관리자가 새로 추가한 준비물, 체크된 특수계약 준비물)은
   "추가 준비물: ○○, ○○"로 별도 줄에 나열.
5. **체크하지 않은 항목은 문장에 전혀 등장하지 않습니다.**
6. 생성된 문장은 `textarea`에 표시되고, 사람이 직접 고치면(`manualBody`) 그 뒤로는
   체크박스를 더 눌러도 자동으로 덮어쓰지 않습니다("다시 생성" 버튼으로만 초기화).

### 날짜와 시간 처리 방식
`<input type="date">`/`<input type="time">`로 입력받아 `formatContractDateKorean`/
`formatContractTimeKorean`(둘 다 `app/lib/contractPrepSms.ts`)이 "9월 11일(금)"/
"오후 3시" 형태 문자열로 변환합니다. **문자 작성일이 아니라 사용자가 고른 실제
계약일/방문일**이며, "내일" 같은 상대 표현은 쓰지 않습니다(요일 계산은 로컬 날짜
직접 분리 방식이라 UTC 하루 밀림 버그 없음, 월말/연말/윤년까지 테스트됨). 같은 함수가
`app/admin/sms/compose/page.tsx`의 "방문 일정 확인" 양식에도 재사용됩니다(계산 로직
중복 없음).

### 손님 이름 처리 방식
- `contract-prep/page.tsx`: `customerName` 텍스트 입력(선택). 비우면 "OO님," 없이 자연스럽게 생략.
- `compose/page.tsx`: `ContactPickerButton`으로 연락처를 선택하면 이름이 `recipientName`에
  채워지고, 이미 본문에 `{이름}` 토큰이 남아있으면 그 자리를 바로 치환, 이후 템플릿
  선택부터는 `resolveSmsTemplate`의 변수로 자동 반영됩니다.

### 항목 관리 기능의 구현 여부
**구현되어 있고, 실제 프로덕션 DB에 대해 추가/수정/순서변경/삭제 4가지 동작을 이번
세션에서 직접 실행해 검증했습니다**(9-①에서 언급한 tsx 스크립트 검증, 3-①). 화면에서는
"항목 관리" 토글 버튼으로 펼쳐서 역할별(공통/매수인/매도인/임차인/임대인/공동명의/
대리계약/법인계약)로 항목을 관리합니다.

### 복사·붙여넣기·문자 보내기 기능
- 복사: `navigator.clipboard.writeText(body)` (`handleCopy`), 성공 시 "복사됨" 2초 표시,
  실패 시 안내.
- 붙여넣기(받는 사람 번호): `navigator.clipboard.readText()`.
- 문자 보내기: `sms:{번호}?body={인코딩된 본문}` 형태의 링크(`buildSmsHref`,
  `app/lib/listingInquiry.ts`)를 `<a href>`로 열어 휴대폰 기본 문자 앱을 띄움.
  **실제 전송 버튼은 문자 앱 안에서 사람이 직접 눌러야 함** — 이 화면 자체에는
  발송 API가 없음(아래 항목 참고).

### 문자 발송 API 연결 여부
**연결 안 됨.** 이 프로젝트는 처음부터 서버발 SMS API(예: 알리고, NHN Cloud, Twilio 등)를
쓰지 않고, `sms:` 딥링크로 휴대폰 문자 앱을 여는 방식만 사용합니다. 필요하다면
신규 기능이며, CLAUDE.md에 이를 금지하는 규칙은 없으나 기존 방식과 아키텍처가
완전히 달라집니다(서버 API 키 관리, 발신번호 사전신고 등) — 착수 전 사용자에게
방향을 확인해야 합니다.

### 모바일 동작
`sms:` 링크는 iOS/Android 문자 앱 모두 표준 지원. `ContactPickerButton`은
**Android Chrome 전용**(Contact Picker API 미지원 브라우저/OS에서는 버튼 자체가
렌더링되지 않도록 `useSyncExternalStore`로 지원 여부를 판정 — "눌러도 반응 없는 버튼"을
만들지 않는 원칙). 관리자 내비(`AdminNav`)는 390px 폭에서도 가로 스크롤 없이
6개 메뉴가 들어가도록 최근 조정됨(3번 참고, 이번 세션 작업은 아님).

### 현재 문제점
- 이번 조사 시점 기준 **코드 레벨에서 발견된 버그는 없습니다**(tsc/eslint/vitest/build
  전부 통과). 다만:
  - 서버발 SMS API가 없어 "자동 대량 발송"은 원천적으로 불가능(설계상 의도 —
    문자는 항상 관리자가 최종 확인 후 직접 전송).
  - 기본 3종 양식(`DEFAULT_SMS_TEMPLATES`)은 DB가 아니라 코드에 있어 관리자가 직접
    문구를 못 고침(계약 준비물 항목과 다른 점, 4번에서 지적).
  - Claude는 로그인 비밀번호가 없어 실제 화면 클릭 테스트를 못 했습니다 — Codex가
    작업을 이어받으면 가장 먼저 실제 로그인 후 `/admin/sms/*` 3개 화면을 육안으로
    확인하는 것을 권장합니다.

### 기존 항목("통장 사본"/"카드나 OTP"/"신분증"/"도장"/"계약금")이 어디에 정의돼 있는지
- **최초 정의(현재는 지워짐)**: `supabase/migrations/0026_contract_prep_items.sql`
  (27~37행) — "공통: 신분증/도장/통장 사본", "매수인: 계약금/계약금 이체 가능한 카드나
  OTP" 등으로 최초 시드됨.
- **"통장 사본"과 "카드나 OTP"는 삭제됨**: `supabase/migrations/0027_contract_prep_items_v2.sql`
  29~31행에서 `delete from contract_prep_items where ...`로 제거. 현재 코드/DB 어디에도
  남아있지 않습니다(grep 확인 완료).
- **"신분증"/"도장"/"계약금"은 지금도 존재**하지만, **DB 행으로만** 존재합니다(하드코딩된
  목록이 코드에 없음). 다만 이 세 라벨은 `app/lib/contractPrepSms.ts`의
  `GENERAL_FOLD_LABELS`(신분증/도장)와 `MONEY_LABEL`(계약금) 상수가 **문자열이 정확히
  일치할 때만** 문장에 자연스럽게 녹이는 특수 취급을 합니다 — 관리자가 이 라벨 문구를
  화면에서 다른 이름으로 바꾸면(예: "계약금" → "계약금(중도금 포함)") 이 특수 취급이
  자동으로 빠지고 "추가 준비물"로 표시되는 일반 항목이 됩니다(정보 손실은 없고 표현만
  달라짐 — 코드 주석에 명시돼 있음).

---

## 10. 다음 작업자가 주의할 점

### 건드리면 안 되는 기능 / 원칙(CLAUDE.md·AGENTS.md 요약, 원문 필독 권장)
- **가격 출처 구분**: 화면의 매물 가격은 전부 "호가"(`askingPrice`)이고 "실거래가"라는
  단어는 국토부 데이터(`actualTradePrice`, `source: "molit"`)에만 씁니다. 수동 확인
  거래 데이터(`source: "mock"`)는 반드시 "수동 확인 자료 · 확인일 ..."을 표시.
- **추천 로직**(`app/lib/recommend/`): 필수조건(예산·거래유형)과 선호조건(단지명/역세권 등)을
  절대 섞지 않습니다. 퍼센트 일치율을 화면에 노출 금지 — "N개 조건 중 M개 충족" 형식만 사용.
- **null 처리**(`app/lib/format/listingFields.ts`): 층/방수/면적/관리비/주차대수는
  `?? 0`/`|| 0` 폴백 절대 금지. 특히 `app/lib/supabase/mappers.ts`.
- **금융 정보 미제공**: 대출한도/LTV/DSR/정책자금/금리 계산·표시 기능은 **의도적으로
  안 만드는 것**입니다. 요청받아도 먼저 사용자에게 재확인. DB에 대출 관련 컬럼
  (`0016_listing_loan_fields.sql`)이 있어도 화면 노출 금지.
- **광고 표시 의무 블록**(`BrokerageInfo.tsx` 등): 매물 상세 페이지의 중개사무소 정보
  블록은 제거/축약 금지.
- **RLS 정책을 임의로 완화하지 않기**(6번 참고) — "정책이 없다"가 버그처럼 보여도
  의도된 설계인 테이블이 많습니다.
- **Supabase 마이그레이션은 요청받지 않는 한 새로 만들지 않기**. 컬럼명 정리는
  `app/lib/supabase/mappers.ts` 매핑 계층에서 처리.

### 기존 코드와 충돌하기 쉬운 부분
- `wip/customers-consultations-2` 브랜치의 마이그레이션 `0015_customers_consultations.sql`을
  그대로 main에 병합하면 **번호가 현재 main의 마지막(0028) 앞으로 끼어들어 순서가
  꼬입니다** — 반드시 0029 이후 번호로 다시 만들어야 합니다(파일 내 작성자 메모 참고).
- `app/lib/supabase/database.types.ts`는 수기 관리 중이라, `npm run gen:supabase-types`로
  재생성하면 이번 세션까지 반영된 수동 수정분과 충돌할 수 있습니다 — 재생성 후 diff를
  꼭 검토하세요.
- 기본 3종 문자 양식(`DEFAULT_SMS_TEMPLATES`, 코드)과 계약 준비물 항목(DB)은 관리 방식이
  다릅니다 — "문자 양식을 고쳐달라"는 요청이 왔을 때 어느 쪽을 말하는지 먼저 확인 필요.
- `proxy.ts`(인증 미들웨어)가 `/api/listings`, `/api/listings/:path*`, `/api/import-naver`를
  "공개 GET + 관리자 전용 쓰기" 혼합 경로로 특별 취급합니다(`isMixedPublicWritePath`).
  새 공개+관리자 혼합 API를 추가할 때 이 목록에 안 넣으면 인증이 전혀 안 걸리거나
  반대로 공개 GET까지 막힐 수 있습니다.

### 데이터 유실 가능성이 있는 부분
- 네이버 매물 가져오기(`/admin/import-naver`, `/admin/listings/new`)의 "기존 매물
  업데이트 저장"은 되돌리기 어려움 — 이미 `window.confirm`으로 단지/동/층/가격을
  보여주고 확인받도록 되어 있음(69a89f3). 이 확인 절차를 생략하는 방향으로 고치지 말 것.
- 단지 삭제(`deleteComplex`, `app/lib/complexes.ts`)는 연결된 이미지까지 CASCADE로
  지워지고 Storage 파일도 정리합니다 — 매물이 남아있으면 DB가 FK로 막고 23503을
  사람이 읽을 메시지로 번역해서 보여줍니다. 이 방어선(ON DELETE RESTRICT)을 풀지 말 것.
- 계약 준비물 항목 삭제(`ItemManager`의 삭제 버튼)는 `confirm()` 후 즉시 DB 삭제,
  되돌리기 기능 없음.

### 배포할 때 필요한 순서
1. Supabase 마이그레이션을 먼저 프로덕션에 적용(대시보드 SQL Editor 또는 MCP
   `apply_migration`) — 스키마 변경이 코드보다 먼저 반영돼야 함.
2. `app/lib/supabase/database.types.ts`를 스키마에 맞게 갱신.
3. 로컬에서 tsc/eslint/vitest/build 통과 확인(12번 방식 그대로).
4. `main`에 커밋 → push → Vercel이 자동으로 production 배포(수동 배포 트리거 불필요).
5. 배포 후 Vercel `list_deployments` 또는 대시보드에서 커밋 SHA가 실제로 실린 것을 확인.

### 테스트가 필요한 핵심 화면
- `/admin/sms/contract-prep` — 이번 세션에서 로직은 검증했으나 브라우저 육안 확인 안 됨.
  체크박스 토글 → 문장 생성 → 항목관리 추가/삭제가 화면에서 실제로 매끄러운지 확인 필요.
- `/admin/sms/compose` — 새 "방문 일정 확인" 양식 선택 → 날짜/시간 picker → 본문 반영
  흐름을 실제 화면에서 확인 필요(이번 세션엔 순수 함수 레벨로만 검증).
- `/admin/listings/inspection` — 중복의심/거래의심 판정은 실데이터(117건 매물) 기준으로
  동작하므로 회귀 시 영향이 큼.

### 과거에 발생했던 배포/저장 문제
- **`hosooingurae.vercel.app` 주소가 검색엔진·과거 링크에 남아 손님에게 잘못된 주소가
  노출된 적 있음** → `next.config.ts` 리다이렉트로 해결(07d0ce9).
- **관리자가 vercel.app 미리보기 도메인으로 접속한 상태에서 만든 문의/공유 링크가
  그 임시 도메인을 담아 손님에게 전달된 적 있음** → 모든 외부 발신 링크를
  `NEXT_PUBLIC_SITE_URL` 고정 기준으로 통일(de71825).
- **0026 마이그레이션 시드가 과거 두 번 실행되어 "신분증/도장/계약금" 등이 역할마다
  2행씩 중복 저장된 적 있음**(0027에서 발견 및 정리, 화면은 라벨 기준 중복제거로
  겉으로는 안 드러났었음 — 항목관리 화면에서만 두 줄로 보였음).
- **평면도 미리보기 상단을 하드 크롭하다가 실제 방 정보가 잘려나간 적 있음** →
  비율 유지 리사이즈로 전환, 기존 36건 재처리(aa212a2).

### 구현하면서 내린 중요한 결정과 그 이유
- **계약 준비물 항목을 새 테이블 대신 기존 `contract_prep_items`의 `role` 값 공간을
  넓혀 재사용**(새 테이블 안 만듦) — 관리 화면·API를 하나로 유지하기 위함.
- **날짜/시간의 요일·오전오후 계산은 한 함수(`contractPrepSms.ts`)만 두고 다른 화면에서도
  재사용** — "같은 계산을 두 벌 만들면 나중에 한쪽만 고쳐지는 문제가 생긴다"는 사용자
  피드백을 반영한 명시적 결정.
- **"체크는 되는데 문자에 아무 효과가 없는" 상태를 최악으로 규정** → 항목이 없는
  특수계약 유형은 체크박스 자체를 안 보여주고, 세 유형이 전부 비면 섹션을 접음.
- **`(role,label)` unique 제약은 데이터부터 정리한 뒤에 건다** — 중복 데이터가 남은
  상태로 제약을 걸면 마이그레이션 자체가 실패한다는 것을 0027 작업에서 학습, 0028에서
  그 순서(정리 확인 → 제약)를 그대로 지킴.
- **서버발 SMS API를 쓰지 않고 `sms:` 딥링크만 쓴다** — 이 저장소의 원래 설계 방침으로
  보이며(발신번호 사전신고 등 없이 즉시 동작), 이번 세션에서 바꾸지 않았습니다.

---

## 11. 다음 작업 추천 순서

### ⚠️ 사용자가 언급한 "계약 전날 보내기 체크리스트화" 작업은 이미 완료돼 있습니다
사용자가 이번 요청에서 우선 과제로 적어주신 내용——"`문자 > 계약 전날 보내기` 화면을
역할별 고정 템플릿이 아니라 체크한 준비물만 반영해 문자가 자동 생성되는 기능으로
바꾸고, OTP 제거·통장 사본 제거·계좌이체 한도 확인 안내·수령인 계좌번호 안내·실제
계약일 표시·공동명의/대리계약/법인계약 확장·미체크 항목 제외·직접 추가한 준비물
반영·기존 복사/전송/모바일 디자인 유지"——는 **원칙 하나하나까지 전부 3번 섹션
①번(및 이 문서 9번 섹션)에 기록된 작업으로 이미 구현·검증·배포되어 있습니다**
(`app/admin/sms/contract-prep/page.tsx`, `app/lib/contractPrepSms.ts`,
`app/lib/contractPrepItems.ts`, 마이그레이션 0026~0028).

Codex가 이 내용을 모른 채 "새 기능"으로 다시 만들면 중복 구현이 되니, **가장 먼저
사용자에게 "이미 되어 있는데 어느 부분이 기대와 다른지" 확인부터 하는 것을
추천합니다.** 유일하게 명시적으로 남겨둔 것은 **"계약일 준비물과 잔금일 준비물 분리"**
쪽입니다 — 0027 마이그레이션 커밋 메시지에 "잔금·소유권이전 단계 서류(등기권리증/
인감도장/인감증명서 등)는 이 화면(계약 전날 전용) 기본 준비물에서 제거했고, **추후
별도의 '잔금 안내 문자' 기능에서 새로 관리할 예정**"이라고 명시돼 있어 — 이 부분만
정말로 미착수 상태입니다.

### 우선순위 제안
1. **(확인 우선)** 사용자에게 위 내용을 확인 — "계약 전날 보내기" 체크리스트화가 이미
   된 것을 알고 계셨는지, 아니면 추가로 원하시는 세부사항이 남아있는지.
2. 실제 로그인해서 `/admin/sms/contract-prep`, `/admin/sms/compose`를 육안으로 확인
   (Claude가 못한 부분, 10번 참고).
3. "잔금 안내 문자" 별도 기능 착수 여부를 사용자와 논의(0027에서 예고된 미착수 작업).
4. 고객 CRM/상담 기록(`wip/customers-consultations-2`)을 계속할지, main에 병합할지
   사용자에게 의사 확인 — 마이그레이션 번호 재배정이 선행돼야 함.
5. `app/admin/consult-helper-experimental/` 고아 페이지 처리 방향 확인(삭제/유지).
6. `.env.local.example`의 `NEXT_PUBLIC_OFFICE_PHONE` 관련 stale한 설명 정리(선택적, 작은 정리).

---

## 12. 검증 결과

기능 코드를 전혀 수정하지 않고, 현재 `main`(커밋 `f90442f`) 기준으로 그대로 실행했습니다.

| 항목 | 명령 | 결과 |
|---|---|---|
| 타입 검사 | `npx tsc --noEmit` | ✅ 통과 (에러 0) |
| 린트 | `npx eslint .` | ✅ 통과 — **에러 0, 경고 12건**(전부 이번 세션 이전부터 있던 것) |
| 테스트 | `npx vitest run` | ✅ 통과 — 33개 파일, **350개 테스트 전부 통과** |
| 프로덕션 빌드 | `npm run build` | ✅ 통과 (Turbopack, 전체 라우트 정상 생성) |

### 린트 경고 12건 상세(에러 아님, 실패 아님 — 참고용)
전부 `@typescript-eslint/no-unused-vars`, 밑줄 접두사(`_columns`, `_column`, `_value`,
`_bucket`)를 쓴 테스트 모킹 함수의 미사용 매개변수 경고와, `app/admin/complexes/[id]/edit/page.tsx`
38행의 미사용 `canDelete` 변수 1건입니다. 전부 이번 세션에서 만든 코드가 아니며 빌드를
막지 않습니다. 필요시 정리하되, 핵심 기능과 무관하므로 우선순위는 낮습니다.

실행 환경: Node.js v22.23.2, npm 10.9.8 (Windows, PowerShell/Git Bash 혼용 가능).

---

*이 문서는 실제 파일 읽기, `git log`/`git status`/`git branch`, Supabase MCP
(`list_tables`/`list_migrations`/`get_advisors`/`execute_sql`), Vercel MCP
(`list_teams`/`list_projects`/`list_deployments`)를 직접 호출해 확인한 결과를 바탕으로
작성했습니다. 대화 기억만으로 채운 내용이 아닙니다.*
