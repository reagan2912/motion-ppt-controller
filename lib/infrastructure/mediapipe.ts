// MediaPipe Gesture Recognizer 어댑터
// §3.2: @mediapipe/tasks-vision 0.10.18 고정
import type { GestureName, Sample } from '@/lib/domain/types';

// CDN URL — 회사망 차단 시 public/models/ 로컬 경로로 변경
const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/' +
  'gesture_recognizer/float16/1/gesture_recognizer.task';

export type GestureLoop = {
  /** 비디오 프레임을 분석하여 Sample을 반환. 손이 없으면 null. */
  recognize: (video: HTMLVideoElement, t: number) => Sample | null;
  /** 리소스 해제 */
  close: () => void;
};

/**
 * GestureRecognizer를 초기화하고 GestureLoop를 반환한다.
 * 비동기 — wasm/모델 다운로드가 포함됨 (최초 1회).
 */
export async function createGestureLoop(): Promise<GestureLoop> {
  // 동적 import — SSR에서 로드 방지 (Next.js 'use client' 컴포넌트에서만 호출됨)
  const { GestureRecognizer, FilesetResolver } = await import('@mediapipe/tasks-vision');

  const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
  const recognizer = await GestureRecognizer.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL_URL },
    runningMode: 'VIDEO',
    numHands: 1,
  });

  return {
    recognize(video, t) {
      const result = recognizer.recognizeForVideo(video, t);
      const top = result.gestures?.[0]?.[0];
      const landmarks = result.landmarks?.[0];
      const wrist = landmarks?.[0];
      const indexTip = landmarks?.[8]; // 검지 끝
      if (!top || !wrist) return null;
      return {
        t,
        x: wrist.x,
        y: wrist.y ?? 0,
        indexX: indexTip?.x ?? wrist.x,
        indexY: indexTip?.y ?? wrist.y ?? 0,
        gesture: top.categoryName as GestureName,
        score: top.score ?? 0,
      };
    },
    close() {
      recognizer.close();
    },
  };
}
