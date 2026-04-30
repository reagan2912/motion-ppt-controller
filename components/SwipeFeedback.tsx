'use client';
// 스와이프 시각 피드백 — 가장자리 글로우 + 페이지 한계 흔들림
import { useEffect, useState } from 'react';
import { FEEDBACK_DURATION_MS } from '@/lib/domain/config';
import type { SwipeDirection } from '@/lib/domain/types';

type FeedbackKind = 'swipe-right' | 'swipe-left' | 'boundary' | null;

type Props = {
  trigger: SwipeDirection | 'boundary' | null;
};

export function SwipeFeedback({ trigger }: Props) {
  const [active, setActive] = useState<FeedbackKind>(null);

  useEffect(() => {
    if (!trigger) return;
    const kind: FeedbackKind =
      trigger === 'right' ? 'swipe-right' : trigger === 'left' ? 'swipe-left' : 'boundary';
    setActive(kind);
    const id = setTimeout(() => setActive(null), FEEDBACK_DURATION_MS);
    return () => clearTimeout(id);
  }, [trigger]);

  return (
    <div className={`swipe-feedback${active ? ` ${active}` : ''}`}>
      <style>{`
        .swipe-feedback {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 50;
          transition: none;
        }
        .swipe-feedback.swipe-right {
          animation: glow-right ${FEEDBACK_DURATION_MS}ms ease forwards;
        }
        .swipe-feedback.swipe-left {
          animation: glow-left ${FEEDBACK_DURATION_MS}ms ease forwards;
        }
        .swipe-feedback.boundary {
          animation: shake ${FEEDBACK_DURATION_MS}ms ease forwards;
        }
      `}</style>
    </div>
  );
}
