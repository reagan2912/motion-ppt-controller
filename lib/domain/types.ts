// 도메인 타입 정의 — 외부 의존 0
// MediaPipe GestureRecognizer의 categoryName 열거
export type GestureName =
  | 'Closed_Fist'
  | 'Open_Palm'
  | 'Pointing_Up'
  | 'Thumbs_Up'
  | 'Thumbs_Down'
  | 'Victory'
  | 'ILoveYou'
  | 'None';

// 제스처 루프 한 프레임의 샘플 (불변)
export type Sample = Readonly<{
  t: number; // 단조 증가 타임스탬프(ms) — 호출자가 제공
  x: number; // 손목(landmark 0) x 좌표 [0, 1] 정규화
  gesture: GestureName;
  score: number; // 제스처 신뢰도 [0, 1]
}>;

export type SwipeDirection = 'left' | 'right';

// 스와이프 판정기 상태 (불변)
export type DetectorState = Readonly<{
  buffer: ReadonlyArray<Sample>;
  cooldownUntil: number; // ms — 이 시각까지 스와이프 무시
}>;

// detectSwipe 반환값
export type DetectResult = Readonly<{
  state: DetectorState;
  swipe: SwipeDirection | null;
}>;

// 튜닝 파라미터 타입
export type SwipeConfig = Readonly<{
  WINDOW_MS: number; // 슬라이딩 윈도우 길이(ms)
  MIN_SAMPLES: number; // 윈도우 내 최소 샘플 수
  OPEN_PALM_RATIO: number; // Open_Palm 프레임 비율 임계 [0,1]
  MIN_SCORE: number; // Open_Palm 신뢰도 임계 [0,1]
  DELTA_X_THRESHOLD: number; // 최소 이동 거리 (정규화 0~1)
  COOLDOWN_MS: number; // 연속 발사 방지 시간(ms)
  INVERT_DIRECTION: boolean; // 카메라 설치 방향 반전 플래그
}>;
