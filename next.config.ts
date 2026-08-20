import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp는 네이티브 바이너리라 서버 번들링 대상에서 제외하고 Node의 기본
  // require로 로드해야 합니다(공식 문서 권장 패턴).
  serverExternalPackages: ["sharp"],
  // serverExternalPackages만으로는 Output File Tracing이 sharp의 플랫폼별
  // 네이티브 바이너리를 일부 라우트의 서버리스 함수 번들에서 누락시킬 수
  // 있습니다(Vercel Runtime Logs에서 "Failed to load external module
  // sharp-*"로 확인된 실제 장애 — 로컬 next start에서는 전체 node_modules를
  // 그대로 쓰기 때문에 재현되지 않고 Vercel 배포에서만 발생). sharp를
  // import하는 모듈(floorPlans/complexImages/unitTypeImages/listingPhotos)이
  // 대부분의 공개 페이지에서 쓰이므로, 모든 라우트에 sharp 전체를 명시적으로
  // 포함시켜 트레이싱 누락을 원천 차단합니다.
  outputFileTracingIncludes: {
    "/*": ["node_modules/sharp/**/*"],
  },
};

export default nextConfig;
