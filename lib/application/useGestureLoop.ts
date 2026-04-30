'use client';
// 카메라 + MediaPipe + Detector를 연결하는 핵심 훅
import { useEffect, useRef, useState } from 'react';
import {
  startCamera,
  classifyCameraError,
  type CameraErrorKind,
  type CameraHandle,
} from '@/lib/infrastructure/camera';
import { createGestureLoop, type GestureLoop } from '@/lib/infrastructure/mediapipe';
import { now } from '@/lib/infrastructure/time';
import { detectSwipe, createInitialState } from '@/lib/domain/swipeDetector';
import { DEFAULT_SWIPE_CONFIG } from '@/lib/domain/config';
import type { DetectorState, Sample, SwipeDirection } from '@/lib/domain/types';

export type LoopStatus = 'idle' | 'starting' | 'running' | 'error';
export type LoopError = CameraErrorKind | 'mediapipe_load_failed';

export type UseGestureLoopArgs = {
  videoRef: React.RefObject<HTMLVideoElement>;
  onSwipe: (dir: SwipeDirection) => void;
  onSample?: (sample: Sample) => void;
  enabled: boolean;
};

/**
 * 카메라 → MediaPipe → 스와이프 판정 루프를 관리한다.
 * onSwipe/onSample은 ref로 래핑 — 콜백이 바뀌어도 루프를 재시작하지 않음.
 */
export function useGestureLoop({ videoRef, onSwipe, onSample, enabled }: UseGestureLoopArgs) {
  const [status, setStatus] = useState<LoopStatus>('idle');
  const [error, setError] = useState<LoopError | null>(null);

  // 콜백을 ref로 래핑 — 최신 값을 항상 참조하되 루프 재시작 방지
  const onSwipeRef = useRef(onSwipe);
  const onSampleRef = useRef(onSample);
  useEffect(() => { onSwipeRef.current = onSwipe; }, [onSwipe]);
  useEffect(() => { onSampleRef.current = onSample; }, [onSample]);

  const handleRef = useRef<{ camera: CameraHandle; gesture: GestureLoop } | null>(null);
  const stateRef = useRef<DetectorState>(createInitialState());
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setStatus('starting');
    setError(null);

    (async () => {
      try {
        const camera = await startCamera();
        if (cancelled) { camera.stop(); return; }

        const video = videoRef.current;
        if (!video) { camera.stop(); throw new Error('videoRef가 연결되지 않았습니다'); }
        video.srcObject = camera.stream;
        await video.play();

        const gesture = await createGestureLoop();
        if (cancelled) { camera.stop(); gesture.close(); return; }

        handleRef.current = { camera, gesture };
        setStatus('running');

        const tick = () => {
          if (cancelled || !handleRef.current) return;
          const t = now();
          const sample = handleRef.current.gesture.recognize(video, t);
          if (sample) {
            onSampleRef.current?.(sample);
            const result = detectSwipe(stateRef.current, sample, DEFAULT_SWIPE_CONFIG);
            stateRef.current = result.state;
            if (result.swipe) onSwipeRef.current(result.swipe);
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch (e) {
        if (cancelled) return;
        const camErr = classifyCameraError(e);
        setError(camErr === 'unknown' ? 'mediapipe_load_failed' : camErr);
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (handleRef.current) {
        handleRef.current.camera.stop();
        handleRef.current.gesture.close();
        handleRef.current = null;
      }
      stateRef.current = createInitialState();
      setStatus('idle');
    };
  }, [enabled, videoRef]); // onSwipe/onSample은 ref로 처리 — 의존성 제거

  return { status, error };
}
