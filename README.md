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

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
