// 손 좌표 → 화면 좌표 변환 + 저역통과 필터 (순수 함수)
// 외부 의존 0

export type Point = Readonly<{ x: number; y: number }>;

export type CursorState = Readonly<{
  smoothed: Point;
}>;

export function createCursorState(): CursorState {
  return { smoothed: { x: 0.5, y: 0.5 } };
}

/**
 * 손 landmark 좌표(정규화 0~1)를 화면 픽셀 좌표로 변환.
 * 저역통과 필터(EMA)로 떨림 제거.
 * stretch: 손 움직임 범위를 화면 전체로 늘림 (중심 기준 확대)
 */
export function mapCursor(
  state: CursorState,
  rawX: number,
  rawY: number,
  screenW: number,
  screenH: number,
  alpha = 0.5,
  stretchX = 2.5, // 좌우 확대 배율 — 작은 손 움직임으로 화면 끝까지 도달
  stretchY = 2.0, // 상하 확대 배율
): { state: CursorState; screenX: number; screenY: number } {
  // 카메라 좌우 반전 보정
  const mirroredX = 1 - rawX;

  // 중심(0.5) 기준으로 stretch 적용
  const stretchedX = 0.5 + (mirroredX - 0.5) * stretchX;
  const stretchedY = 0.5 + (rawY - 0.5) * stretchY;

  // 0~1 범위로 클램핑
  const clampedX = Math.min(Math.max(stretchedX, 0), 1);
  const clampedY = Math.min(Math.max(stretchedY, 0), 1);

  // EMA 저역통과 필터
  const smoothedX = alpha * clampedX + (1 - alpha) * state.smoothed.x;
  const smoothedY = alpha * clampedY + (1 - alpha) * state.smoothed.y;

  return {
    state: { smoothed: { x: smoothedX, y: smoothedY } },
    screenX: Math.round(smoothedX * screenW),
    screenY: Math.round(smoothedY * screenH),
  };
}
