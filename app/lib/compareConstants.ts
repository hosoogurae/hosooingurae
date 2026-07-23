/**
 * compareSelection.ts(클라이언트 전용, useSyncExternalStore 사용)와 서버
 * 컴포넌트인 app/compare/page.tsx가 이 값을 공유해야 하는데, React 훅을 쓰는
 * 모듈을 서버 컴포넌트에서 import할 수 없어 상수만 별도 파일로 뺐습니다.
 */
export const MAX_COMPARE_SELECTION = 3;
