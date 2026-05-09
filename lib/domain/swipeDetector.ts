// 스와이프 판정 — 순수 함수, 외부 의존 0
// Date.now() 호출 금지 — 타임스탬프는 항상 인자로 받는다
import type { DetectorState, DetectResult, Sample, SwipeConfig } from './types';

/** 초기 상태 생성 */
export function createInitialState(): DetectorState {
  return { buffer: [], cooldownUntil: 0 };
}

/**
 * 새 샘플을 받아 스와이프 방향을 판정한다.
 *
 * 의사코드(§5.3) 구현:
 * 1. 버퍼에 샘플 추가
 * 2. WINDOW_MS 밖의 오래된 샘플 제거
 * 3. 쿨다운 중이면 null 반환
 * 4. 최소 샘플 수 미달이면 null 반환
 * 5. Open_Palm 비율 계산 → 임계 미달이면 null 반환
 * 6. deltaX 계산 → 임계 미달이면 null 반환
 * 7. 스와이프 발사 + 쿨다운 설정
 */
export function detectSwipe(
  state: DetectorState,
  sample: Sample,
  config: SwipeConfig,
): DetectResult {
  // 1. 새 샘플 추가
  const extended = [...state.buffer, sample];

  // 2. 윈도우 밖 샘플 제거
  const windowed = extended.filter((s) => sample.t - s.t <= config.WINDOW_MS);

  const nextStateBase: DetectorState = {
    buffer: windowed,
    cooldownUntil: state.cooldownUntil,
  };

  // 3. 쿨다운 중이면 스와이프 없이 반환 (버퍼는 정리함)
  if (sample.t < state.cooldownUntil) {
    return { state: { buffer: [], cooldownUntil: state.cooldownUntil }, swipe: null };
  }

  // 4. 최소 샘플 수 미달
  if (windowed.length < config.MIN_SAMPLES) {
    return { state: nextStateBase, swipe: null };
  }

  // 5. Open_Palm 또는 Pointing_Up 비율 계산
  const openPalmCount = windowed.filter(
    (s) =>
      (s.gesture === 'Open_Palm' || s.gesture === 'Pointing_Up') &&
      s.score >= config.MIN_SCORE,
  ).length;
  const openPalmRatio = openPalmCount / windowed.length;

  if (openPalmRatio < config.OPEN_PALM_RATIO) {
    return { state: nextStateBase, swipe: null };
  }

  // 6. deltaX 계산
  const first = windowed[0];
  const last = windowed[windowed.length - 1];

  // noUncheckedIndexedAccess 대응 — 위에서 length >= MIN_SAMPLES >= 1 보장됨
  if (first === undefined || last === undefined) {
    return { state: nextStateBase, swipe: null };
  }

  const deltaX = last.x - first.x;

  if (Math.abs(deltaX) < config.DELTA_X_THRESHOLD) {
    return { state: nextStateBase, swipe: null };
  }

  // 속도 체크 — 빠른 동작만 인식 (돌아오는 느린 동작 무시)
  const elapsed = last.t - first.t;
  const speed = elapsed > 0 ? Math.abs(deltaX) / elapsed : 0;
  // 최소 속도: 0.0004 — 의도적인 빠른 스와이프만 인식
  if (speed < 0.0004) {
    return { state: nextStateBase, swipe: null };
  }

  // 7. 스와이프 발사
  // 카메라 시점: 사용자 우측 이동 → x 감소 → deltaX < 0 → 다음 페이지
  // INVERT_DIRECTION=true 이면 반전
  let rawSwipe: 'left' | 'right' = deltaX > 0 ? 'right' : 'left';
  if (config.INVERT_DIRECTION) {
    rawSwipe = rawSwipe === 'left' ? 'right' : 'left';
  }

  const nextState: DetectorState = {
    buffer: [],
    cooldownUntil: sample.t + config.COOLDOWN_MS,
  };

  return { state: nextState, swipe: rawSwipe };
}
