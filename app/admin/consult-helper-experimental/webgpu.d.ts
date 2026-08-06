// 이 프로젝트의 TS lib(dom)에는 아직 WebGPU 타입이 없어, 사전 어댑터 검증에
// 필요한 최소한만 여기서 선언합니다(@webgpu/types 전체를 추가하지 않음).
// import/export가 없어야 전역 ambient 선언으로 인식됩니다.

interface Navigator {
  gpu?: {
    requestAdapter: () => Promise<object | null>;
  };
}
