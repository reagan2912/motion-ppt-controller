'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { mapCursor, createCursorState, type CursorState, type Point } from '@/lib/domain/cursorMapper';
import { detectDwell, createDwellState, resetDwell, type DwellState } from '@/lib/domain/dwellDetector';
import type { Sample } from '@/lib/domain/types';

export type Phase2State =
  | { mode: 'swipe' }
  | { mode: 'menu'; cursorX: number; cursorY: number; dwellProgress: number; dwellIndex: number | null; scrollDelta: number };

const PALM_HOLD_MS = 1500;

export type UsePhase2LoopArgs = {
  onMenuOpen: () => void;
  onMenuClose: () => void;
  onJump: (slideIndex: number) => void;
  slideCount: number;
  screenW: number;
  screenH: number;
  enabled: boolean;
};

export function usePhase2Loop({
  onMenuOpen,
  onMenuClose,
  onJump,
  slideCount,
  screenW,
  screenH,
  enabled,
}: UsePhase2LoopArgs) {
  const [phase2State, setPhase2State] = useState<Phase2State>({ mode: 'swipe' });

  const cursorStateRef = useRef<CursorState>(createCursorState());
  const dwellStateRef = useRef<DwellState>(createDwellState());
  const palmHoldStartRef = useRef<number | null>(null);
  const modeRef = useRef<'swipe' | 'menu'>('swipe');
  const prevIndexYRef = useRef<number | null>(null); // 스크롤용 이전 Y 좌표

  // 콜백 최신값 ref
  const onMenuOpenRef = useRef(onMenuOpen);
  const onMenuCloseRef = useRef(onMenuClose);
  const onJumpRef = useRef(onJump);
  useEffect(() => { onMenuOpenRef.current = onMenuOpen; }, [onMenuOpen]);
  useEffect(() => { onMenuCloseRef.current = onMenuClose; }, [onMenuClose]);
  useEffect(() => { onJumpRef.current = onJump; }, [onJump]);

  const screenWRef = useRef(screenW);
  const screenHRef = useRef(screenH);
  const slideCountRef = useRef(slideCount);
  useEffect(() => { screenWRef.current = screenW; }, [screenW]);
  useEffect(() => { screenHRef.current = screenH; }, [screenH]);
  useEffect(() => { slideCountRef.current = slideCount; }, [slideCount]);

  // 외부에서 샘플을 주입하는 함수 — page.tsx에서 직접 호출
  const pushSample = useCallback((s: Sample) => {
    if (!enabled) return;
    const t = s.t;

    if (modeRef.current === 'swipe') {
      // 주먹 1.5초 정지 → 목차 열기
      if (s.gesture === 'Closed_Fist' && s.score >= 0.7) {
        if (palmHoldStartRef.current === null) {
          palmHoldStartRef.current = t;
        } else if (t - palmHoldStartRef.current >= PALM_HOLD_MS) {
          modeRef.current = 'menu';
          palmHoldStartRef.current = null;
          cursorStateRef.current = createCursorState();
          dwellStateRef.current = resetDwell(s.x, s.y, t);
          setPhase2State({
            mode: 'menu',
            cursorX: screenWRef.current / 2,
            cursorY: screenHRef.current / 2,
            dwellProgress: 0,
            dwellIndex: null,
          });
          onMenuOpenRef.current();
        }
      } else {
        palmHoldStartRef.current = null;
      }
      return;
    }

    // 메뉴 모드 — 주먹 1.5초 정지 → 닫기
    if (s.gesture === 'Closed_Fist' && s.score >= 0.7) {
      if (palmHoldStartRef.current === null) {
        palmHoldStartRef.current = t;
      } else if (t - palmHoldStartRef.current >= PALM_HOLD_MS) {
        modeRef.current = 'swipe';
        palmHoldStartRef.current = null;
        setPhase2State({ mode: 'swipe' });
        onMenuCloseRef.current();
      }
      return;
    } else {
      palmHoldStartRef.current = null;
    }

    if (s.gesture === 'Pointing_Up' && s.score >= 0.5) {
      const sw = screenWRef.current;
      const sh = screenHRef.current;
      const sc = slideCountRef.current;

      const mapped = mapCursor(cursorStateRef.current, s.indexX, s.indexY, sw, sh, 0.8, 3.0, 2.5);
      cursorStateRef.current = mapped.state;

      // Y축 이동으로 스크롤 감지
      const SCROLL_SPEED = 2000; // 600 → 2000: 손가락 조금만 움직여도 확 내려감
      let scrollDelta = 0;
      if (prevIndexYRef.current !== null) {
        const dy = s.indexY - prevIndexYRef.current;
        if (Math.abs(dy) > 0.002) { // 0.005 → 0.002: 더 민감하게
          scrollDelta = dy * SCROLL_SPEED;
        }
      }
      prevIndexYRef.current = s.indexY;

      const MENU_WIDTH = 320;
      const inMenuArea = mapped.screenX <= MENU_WIDTH;

      const MENU_HEADER_H = 80;
      const menuListH = sh - MENU_HEADER_H;
      const menuItemH = menuListH / Math.max(sc, 1);
      const hoveredIndex = inMenuArea
        ? Math.min(Math.max(Math.floor((mapped.screenY - MENU_HEADER_H) / menuItemH), 0), sc - 1)
        : null;

      const normX = mapped.screenX / sw;
      const normY = mapped.screenY / sh;
      const dwell = detectDwell(dwellStateRef.current, normX, normY, t);
      dwellStateRef.current = dwell.state;

      if (dwell.fired && inMenuArea && hoveredIndex !== null) {
        modeRef.current = 'swipe';
        prevIndexYRef.current = null;
        setPhase2State({ mode: 'swipe' });
        onMenuCloseRef.current();
        onJumpRef.current(hoveredIndex);
        dwellStateRef.current = createDwellState();
        return;
      }

      setPhase2State({
        mode: 'menu',
        cursorX: mapped.screenX,
        cursorY: mapped.screenY,
        dwellProgress: inMenuArea ? dwell.progress : 0,
        dwellIndex: hoveredIndex,
        scrollDelta,
      });
    } else {
      // Pointing_Up 아닐 때 Y 기준점 리셋
      prevIndexYRef.current = null;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      modeRef.current = 'swipe';
      palmHoldStartRef.current = null;
      setPhase2State({ mode: 'swipe' });
    }
  }, [enabled]);

  return { phase2State, pushSample };
}
