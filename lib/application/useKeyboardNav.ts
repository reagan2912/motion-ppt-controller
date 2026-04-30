'use client';
// 키보드 백업 입력 훅 — 카메라 미작동 시 대비
import { useEffect } from 'react';

export type KeyHandlers = {
  onNext: () => void;
  onPrev: () => void;
  onFirst: () => void;
  onLast: () => void;
  onExit: () => void;
};

/**
 * 키보드 단축키를 등록한다.
 * enabled=false 이면 등록하지 않음.
 * 중요: h 객체는 useCallback으로 안정화해야 한다.
 */
export function useKeyboardNav(h: KeyHandlers, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
        case 'PageDown':
          e.preventDefault();
          h.onNext();
          break;
        case 'ArrowLeft':
        case 'Backspace':
        case 'PageUp':
          e.preventDefault();
          h.onPrev();
          break;
        case 'Home':
          e.preventDefault();
          h.onFirst();
          break;
        case 'End':
          e.preventDefault();
          h.onLast();
          break;
        case 'Escape':
          h.onExit();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled, h]);
}
