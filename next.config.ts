import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp는 네이티브 바이너리라 서버 번들링 대상에서 제외하고 Node의 기본
  // require로 로드해야 합니다(공식 문서 권장 패턴).
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
