import type { SwipeConfig } from './types';

export const DEFAULT_SWIPE_CONFIG: SwipeConfig = {
  WINDOW_MS: 600,
  MIN_SAMPLES: 2,
  OPEN_PALM_RATIO: 0.0,
  MIN_SCORE: 0.0,
  DELTA_X_THRESHOLD: 0.08,
  COOLDOWN_MS: 2000,       // 1200 → 2000ms: 팔 돌아오는 동작 완전 차단
  INVERT_DIRECTION: false,
} as const;

export const PDF_MAX_BYTES = 200 * 1024 * 1024;
export const CAMERA_PREVIEW_W = 200;
export const CAMERA_PREVIEW_H = 150;
export const FEEDBACK_DURATION_MS = 300;
export const DEBUG_REFRESH_HZ = 10;
