// 스와이프 판정 — 순수 함수, 외부 의존 0
import type { DetectorState, DetectResult, Sample, SwipeConfig } from './types';

export function createInitialState(): DetectorState {
  return { buffer: [], cooldownUntil: 0 };
}

/**
 * Open_Palm(손바닥) 또는 Pointing_Up(검지) 제스처일 때만 스와이프 판정.
 * 다른 손 모양(주먹 등)은 무시.
 */
export function detectSwipe(
  state: DetectorState,
  sample: Sample,
  config: SwipeConfig,
): DetectResult {
  const windowed = [...state.buffer, sample].filter(
    (s) => sample.t - s.t <= config.WINDOW_MS,
  );

  const nextStateBase: DetectorState = {
    buffer: windowed,
    cooldownUntil: state.cooldownUntil,
  };

  // 쿨다운 중
  if (sample.t < state.cooldownUntil) {
    return { state: { buffer: [], cooldownUntil: state.cooldownUntil }, swipe: null };
  }

  // 최소 샘플 수 미달
  if (windowed.length < config.MIN_SAMPLES) {
    return { state: nextStateBase, swipe: null };
  }

  // 제스처 체크 — Open_Palm 또는 Pointing_Up 비율 확인
  const validCount = windowed.filter(
    (s) =>
      (s.gesture === 'Open_Palm' || s.gesture === 'Pointing_Up') &&
      s.score >= config.MIN_SCORE,
  ).length;
  const validRatio = validCount / windowed.length;

  if (validRatio < config.OPEN_PALM_RATIO) {
    return { state: nextStateBase, swipe: null };
  }

  const first = windowed[0];
  const last = windowed[windowed.length - 1];
  if (first === undefined || last === undefined) {
    return { state: nextStateBase, swipe: null };
  }

  // 이동 거리
  const deltaX = last.x - first.x;
  if (Math.abs(deltaX) < config.DELTA_X_THRESHOLD) {
    return { state: nextStateBase, swipe: null };
  }

  // 이동 속도 — 천천히 움직이면 무시
  const elapsed = last.t - first.t;
  const speed = elapsed > 0 ? Math.abs(deltaX) / elapsed : 0;
  if (speed < 0.0003) {
    return { state: nextStateBase, swipe: null };
  }

  // 스와이프 발사
  let rawSwipe: 'left' | 'right' = deltaX > 0 ? 'right' : 'left';
  if (config.INVERT_DIRECTION) {
    rawSwipe = rawSwipe === 'left' ? 'right' : 'left';
  }

  return {
    state: { buffer: [], cooldownUntil: sample.t + config.COOLDOWN_MS },
    swipe: rawSwipe,
  };
}
