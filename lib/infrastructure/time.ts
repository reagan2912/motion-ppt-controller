// 시간 추상화 — performance.now()를 래핑해 테스트에서 대체 가능하게 함
// Date.now() 는 시스템 시계 영향 받음; performance.now()는 단조 증가(monotonic)
export const now = (): number => performance.now();
