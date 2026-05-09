// 단일 진실의 출처(Single Source of Truth) — 튜닝 상수는 이 파일에만 정의
import type { SwipeConfig } from './types';

export const DEFAULT_SWIPE_CONFIG: SwipeConfig = {
  WINDOW_MS: 500,
  MIN_SAMPLES: 2,
  OPEN_PALM_RATIO: 0.2,
  MIN_SCORE: 0.4,
  DELTA_X_THRESHOLD: 0.12, // 0.05 → 0.12: 더 크게 움직여야 인식
  COOLDOWN_MS: 1500,
  INVERT_DIRECTION: false,
} as const;

// PDF 제한
export const PDF_MAX_BYTES = 200 * 1024 * 1024; // 200MB

// 카메라 프리뷰 크기
export const CAMERA_PREVIEW_W = 200;
export const CAMERA_PREVIEW_H = 150;

// 시각 피드백 지속 시간(ms)
export const FEEDBACK_DURATION_MS = 300;

// 디버그 오버레이 갱신 주기(Hz)
export const DEBUG_REFRESH_HZ = 10;
