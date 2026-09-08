import type { NextConfig } from "next";

// 매물/단지/평면도 사진은 전부 Supabase Storage 공개 버킷에 있습니다.
// 프로젝트 URL에서 호스트네임만 뽑아 등록해두면 나중에 Supabase 프로젝트가
// 바뀌어도 이 파일을 고칠 필요가 없습니다.
const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    // 기본값도 webp지만, next dev(Turbopack)에서 협상 여부를 직접
    // 확인해야 해서 명시적으로 적어둡니다.
    formats: ["image/webp"],
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: "https",
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
  // sharp는 네이티브 바이너리라 서버 번들링 대상에서 제외하고 Node의 기본
  // require로 로드해야 합니다(공식 문서 권장 패턴).
  serverExternalPackages: ["sharp"],
  // serverExternalPackages만으로는 Output File Tracing이 sharp의 플랫폼별
  // 네이티브 바이너리를 일부 라우트의 서버리스 함수 번들에서 누락시킬 수
  // 있습니다(Vercel Runtime Logs에서 "Failed to load external module
  // sharp-*"로 확인된 실제 장애 — 로컬 next start에서는 전체 node_modules를
  // 그대로 쓰기 때문에 재현되지 않고 Vercel 배포에서만 발생). sharp를
  // import하는 모듈(floorPlans/complexImages/unitTypeImages/listingPhotos)이
  // 대부분의 공개 페이지에서 쓰이므로, 모든 라우트에 명시적으로 포함시켜
  // 트레이싱 누락을 원천 차단합니다.
  //
  // node_modules/sharp/**/*만으로는 부족합니다 — sharp의 실제 네이티브
  // .node 바이너리는 sharp 패키지 내부가 아니라 @img/sharp-<platform>-
  // <arch>, @img/sharp-libvips-<platform>-<arch>라는 별도 scoped 패키지
  // (node_modules/@img/*)에 들어있습니다. 1차 수정 때 이걸 놓쳐서 로컬
  // 트레이스에 바이너리가 보였던 건 이 include 설정이 아니라 Next 기본
  // 트레이싱이 로컬(win32)에서는 우연히 따라간 것이었고, Vercel(Linux)
  // 빌드에서는 그 기본 트레이싱이 못 따라가 바이너리가 통째로 빠졌던
  // 것으로 보입니다.
  outputFileTracingIncludes: {
    "/*": ["node_modules/sharp/**/*", "node_modules/@img/**/*"],
  },
  // sw.js를 CDN/브라우저가 캐싱하면 push 리스너를 새로 추가해도 기기에
  // 반영되지 않을 수 있어(등록 시 updateViaCache:'none'과 별개로, 서버가
  // 캐시 헤더를 내려주면 그걸 우선시하는 중간 캐시가 있을 수 있음)
  // 명시적으로 캐시를 막습니다.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
  // /valuation과 /sise("우리 집 시세")를 하나로 합치면서 /valuation은
  // 없앴습니다. 검색엔진에 아직 등록된 적이 없어 지금이 바꾸기 가장 싼
  // 시점이라 판단해 영구 리다이렉트로 처리합니다(쿼리스트링은 Next.js가
  // 자동으로 새 경로에 그대로 실어 보냅니다).
  //
  // 관리자 메뉴 정리(문자/매물/도구를 탭 구조로 합침)로 옮겨진 화면들도
  // 같은 방식으로 이전 주소를 살려둡니다 — 관리자 화면은 noindex라
  // SEO상 permanent 여부가 중요하진 않지만, 폰에 설치된 관리자 PWA의
  // 푸시 알림·즐겨찾기 등 옛 주소를 여는 곳이 있을 수 있어 그대로
  // 작동하게 합니다. 그룹의 "기본 탭" 리다이렉트(예: /admin/sms →
  // /admin/sms/compose)는 나중에 기본 탭이 바뀔 수 있어 permanent를
  // 끕니다.
  async redirects() {
    return [
      // 도메인 정리: Vercel이 프로덕션 배포에 자동으로 붙여주는 고정 별칭
      // hosooingurae.vercel.app으로 들어와도 손님에게는 항상 진짜 주소
      // (hosoobudongsan.kr)만 보여야 합니다 — 예전에 이 별칭으로 접속한
      // 상태에서 문의 텍스트를 만들면 그 주소가 그대로 손님에게 전달되는
      // 사고가 있었습니다(app/lib/siteUrl.ts에서 코드는 이미 고쳤지만,
      // 링크·검색엔진 색인·주소창에 남아있을 옛 vercel.app 주소까지
      // 막으려면 이 리다이렉트가 필요합니다).
      //
      // host 값을 ^...$ 로 정확히 고정해서 hosooingurae.vercel.app 딱
      // 그 도메인만 걸립니다 — 브랜치/PR 미리보기 배포(예:
      // hosooingurae-git-<branch>-<team>.vercel.app)는 완전히 다른
      // 호스트라 이 규칙에 안 걸리고 그대로 동작합니다. 경로와 쿼리는
      // Next.js가 자동으로 그대로 옮겨줍니다(예:
      // /listings/4-3-000-mtsmg96g?foo=bar → 새 도메인의 같은 경로+쿼리).
      {
        source: "/:path*",
        has: [{ type: "host", value: "^hosooingurae\\.vercel\\.app$" }],
        destination: "https://hosoobudongsan.kr/:path*",
        permanent: true,
      },
      {
        source: "/valuation",
        destination: "/sise",
        permanent: true,
      },
      // 문자
      { source: "/admin/sms", destination: "/admin/sms/compose", permanent: false },
      { source: "/admin/sms-compose", destination: "/admin/sms/compose", permanent: true },
      { source: "/admin/sms-templates", destination: "/admin/sms/templates", permanent: true },
      {
        source: "/admin/contract-prep-sms",
        destination: "/admin/sms/contract-prep",
        permanent: true,
      },
      // 매물
      { source: "/admin/listings", destination: "/admin/listings/manage", permanent: false },
      {
        source: "/admin/listing-submissions",
        destination: "/admin/listings/submissions",
        permanent: true,
      },
      {
        source: "/admin/listing-inspection",
        destination: "/admin/listings/inspection",
        permanent: true,
      },
      {
        source: "/admin/listing-inspection/floor-plan-cleanup",
        destination: "/admin/listings/inspection/floor-plan-cleanup",
        permanent: true,
      },
      // 도구
      { source: "/admin/tools", destination: "/admin/tools/consult-helper", permanent: false },
      {
        source: "/admin/consult-helper",
        destination: "/admin/tools/consult-helper",
        permanent: true,
      },
      { source: "/admin/ad-copy", destination: "/admin/tools/ad-copy", permanent: true },
      // 단지: 평면도 관리 단독 화면은 단지 편집 화면과 완전히 중복이라
      // 없앴습니다(같은 FloorPlanManager 컴포넌트).
      { source: "/admin/floor-plans", destination: "/admin/complexes", permanent: true },
    ];
  },
};

export default nextConfig;
