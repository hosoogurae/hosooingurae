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
};

export default nextConfig;
