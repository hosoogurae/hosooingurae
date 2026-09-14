This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## 환경변수

이 저장소는 공개(public)이므로 실제 값은 여기에도, `.env.local.example`
에도 절대 적지 않습니다. 이름과 용도만 문서화합니다.

- `CRON_SECRET` — "지역 소식" 자동 수집 크론(`/api/cron/notices`)을
  Vercel 예약 실행만 호출할 수 있게 막는 열쇠입니다. 이 경로는
  `proxy.ts`의 인증 대상이 아니라서 라우트 자체가 이 값으로
  `Authorization: Bearer <값>` 헤더를 검사합니다. Vercel 프로젝트
  환경변수에 **Secret 타입**으로 등록해야 합니다(Config/Plaintext 아님 —
  값이 대시보드에도 평문으로 다시 노출되지 않아야 합니다).

## 배포 리전

`vercel.json`의 `regions: ["sin1"]`(싱가포르)는 의도적인 설정입니다.
`vercel.json`은 표준 JSON이라 주석을 못 남기므로 이유를 여기 적습니다.

- Supabase 프로젝트가 `ap-southeast-1`(싱가포르)에 있습니다.
- 페이지 하나를 렌더링할 때 Supabase를 3~6번 왕복하는데(루트
  레이아웃의 단지/매물/이미지 조회가 모든 페이지에 공통으로 깔림),
  손님에게 가는 최종 응답은 1번뿐입니다. 그래서 서버를 DB 옆(sin1)에
  두는 쪽이, 손님과 가까운 리전(예: 서울 icn1)에 두는 것보다 총
  지연이 작습니다 — Vercel 공식 문서도 "함수는 DB와 같은 리전이나
  최대한 가까운 곳에서 실행하라"고 권장합니다.
- 이전 기본값은 Vercel 신규 프로젝트 기본 리전인 `iad1`(미국
  버지니아)이었고, Supabase Gateway Timeout이 잦았던 원인 중
  하나로 지목되어 바꿨습니다.
- Hobby 요금제는 함수 리전을 하나만 지정할 수 있습니다(Pro부터
  다중 리전).

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
