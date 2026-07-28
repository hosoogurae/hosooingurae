import { defineConfig } from "vitest/config";

/**
 * app/lib의 순수 로직(파서 등)을 검증하는 용도. Node 환경이면 충분하고
 * (브라우저 API가 필요 없음), 별도 setup 파일도 필요 없습니다.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["app/**/*.test.ts"],
  },
});
