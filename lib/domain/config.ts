import type { SwipeConfig } from './types';

export const DEFAULT_SWIPE_CONFIG: SwipeConfig = {
  WINDOW_MS: 600,
  MIN_SAMPLES: 2,
  OPEN_PALM_RATIO: 0.5,  // 50% 이상이 Open_Palm 또는 Pointing_Up이어야 인식
  MIN_SCORE: 0.5,        // 신뢰도 기준
  DELTA_X_THRESHOLD: 0.08,
  COOLDOWN_MS: 2000,
  INVERT_DIRECTION: false,
} as const;

export const PDF_MAX_BYTES = 200 * 1024 * 1024;
export const CAMERA_PREVIEW_W = 200;
export const CAMERA_PREVIEW_H = 150;
export const FEEDBACK_DURATION_MS = 300;
export const DEBUG_REFRESH_HZ = 10;
