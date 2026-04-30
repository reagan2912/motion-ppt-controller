'use client';
// UI 없는 훅 호스트 컴포넌트 — useGestureLoop를 마운트/언마운트에 연결
import { useEffect, type RefObject } from 'react';
import { useGestureLoop, type LoopStatus, type LoopError } from '@/lib/application/useGestureLoop';
import type { Sample, SwipeDirection } from '@/lib/domain/types';

type Props = {
  videoRef: RefObject<HTMLVideoElement>;
  onSwipe: (dir: SwipeDirection) => void;
  onSample?: (sample: Sample) => void;
  onStatusChange?: (status: LoopStatus, error: LoopError | null) => void;
  enabled: boolean;
};

export function GestureController({ videoRef, onSwipe, onSample, onStatusChange, enabled }: Props) {
  const { status, error } = useGestureLoop({ videoRef, onSwipe, onSample, enabled });

  // 렌더 중 직접 호출하면 무한 리렌더 — useEffect로 전파
  useEffect(() => {
    onStatusChange?.(status, error);
  }, [status, error, onStatusChange]);

  return null;
}
