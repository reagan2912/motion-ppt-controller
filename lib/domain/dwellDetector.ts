// Dwell-time 판정 — 순수 함수, 외부 의존 0
// 커서가 같은 위치에 1.5초 머물면 클릭으로 판정

export type DwellState = Readonly<{
  anchorX: number;
  anchorY: number;
  startT: number;       // 정지 시작 시각(ms)
  triggered: boolean;   // 이미 발사됐으면 true (중복 방지)
}>;

export type DwellResult = Readonly<{
  state: DwellState;
  progress: number;     // 0~1 (원형 게이지용)
  fired: boolean;       // 이번 프레임에 클릭 발사됐으면 true
}>;

const MOVE_THRESHOLD = 0.04; // 정규화 좌표 기준 이 이상 움직이면 리셋
const DWELL_MS = 1500;       // 1.5초

export function createDwellState(): DwellState {
  return { anchorX: 0, anchorY: 0, startT: 0, triggered: false };
}

/**
 * 매 프레임 호출.
 * x, y: 정규화 손 좌표(0~1)
 * t: 현재 타임스탬프(ms)
 */
export function detectDwell(
  state: DwellState,
  x: number,
  y: number,
  t: number,
): DwellResult {
  const dx = x - state.anchorX;
  const dy = y - state.anchorY;
  const moved = Math.sqrt(dx * dx + dy * dy) > MOVE_THRESHOLD;

  // 움직이면 앵커 리셋
  if (moved) {
    return {
      state: { anchorX: x, anchorY: y, startT: t, triggered: false },
      progress: 0,
      fired: false,
    };
  }

  const elapsed = t - state.startT;
  const progress = Math.min(elapsed / DWELL_MS, 1);

  // 이미 발사됐으면 progress 유지, fired=false
  if (state.triggered) {
    return { state, progress: 1, fired: false };
  }

  // 1.5초 도달 → 발사
  if (elapsed >= DWELL_MS) {
    return {
      state: { ...state, triggered: true },
      progress: 1,
      fired: true,
    };
  }

  return { state, progress, fired: false };
}

/**
 * 메뉴가 닫히거나 모드 전환 시 상태 초기화
 */
export function resetDwell(x: number, y: number, t: number): DwellState {
  return { anchorX: x, anchorY: y, startT: t, triggered: false };
}
