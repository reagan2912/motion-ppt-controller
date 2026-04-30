'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { DEBUG_REFRESH_HZ, DEFAULT_SWIPE_CONFIG } from '@/lib/domain/config';
import type { Sample } from '@/lib/domain/types';

type Props = {
  isDebug: boolean;
  onSampleRef: (setter: (s: Sample) => void) => void;
};

type DisplayState = {
  gesture: string;
  score: number;
  x: number;
  deltaX: number;
  bufferLen: number;
  fps: number;
  lastSwipe: string;
  palmRatio: number;
};

export function DebugOverlay({ isDebug, onSampleRef }: Props) {
  const [display, setDisplay] = useState<DisplayState>({
    gesture: '-',
    score: 0,
    x: 0,
    deltaX: 0,
    bufferLen: 0,
    fps: 0,
    lastSwipe: '-',
    palmRatio: 0,
  });

  const samplesRef = useRef<Sample[]>([]);
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(performance.now());
  const lastSwipeRef = useRef('-');

  const handleSample = useCallback((s: Sample) => {
    frameCountRef.current += 1;
    const t = performance.now();
    samplesRef.current = [...samplesRef.current, { ...s, t }].filter(
      (prev) => t - prev.t <= DEFAULT_SWIPE_CONFIG.WINDOW_MS,
    );
  }, []);

  useEffect(() => {
    onSampleRef(handleSample);
  }, [handleSample, onSampleRef]);

  useEffect(() => {
    if (!isDebug) return;
    const intervalMs = Math.round(1000 / DEBUG_REFRESH_HZ);
    const id = setInterval(() => {
      const samples = samplesRef.current;
      const latest = samples[samples.length - 1];
      const oldest = samples[0];

      const now = performance.now();
      const elapsed = now - lastFpsTimeRef.current;
      const fps = elapsed > 0 ? Math.round((frameCountRef.current / elapsed) * 1000) : 0;
      frameCountRef.current = 0;
      lastFpsTimeRef.current = now;

      if (latest && oldest) {
        const deltaX = latest.x - oldest.x;
        const palmCount = samples.filter(
          (s) =>
            (s.gesture === 'Open_Palm' || s.gesture === 'Pointing_Up') &&
            s.score >= DEFAULT_SWIPE_CONFIG.MIN_SCORE,
        ).length;
        const palmRatio = samples.length > 0 ? palmCount / samples.length : 0;

        const willSwipe =
          palmRatio >= DEFAULT_SWIPE_CONFIG.OPEN_PALM_RATIO &&
          Math.abs(deltaX) >= DEFAULT_SWIPE_CONFIG.DELTA_X_THRESHOLD &&
          samples.length >= DEFAULT_SWIPE_CONFIG.MIN_SAMPLES;

        if (willSwipe) {
          lastSwipeRef.current = deltaX > 0 ? '→ RIGHT' : '← LEFT';
        }

        setDisplay({
          gesture: latest.gesture,
          score: latest.score,
          x: latest.x,
          deltaX,
          bufferLen: samples.length,
          fps,
          lastSwipe: lastSwipeRef.current,
          palmRatio,
        });
      } else {
        setDisplay((d) => ({
          ...d,
          fps,
          gesture: latest?.gesture ?? '-',
          score: latest?.score ?? 0,
        }));
      }
    }, intervalMs);
    return () => clearInterval(id);
  }, [isDebug]);

  if (!isDebug) return null;

  const thresholdOk = Math.abs(display.deltaX) >= DEFAULT_SWIPE_CONFIG.DELTA_X_THRESHOLD;
  const ratioOk = display.palmRatio >= DEFAULT_SWIPE_CONFIG.OPEN_PALM_RATIO;
  const bufferOk = display.bufferLen >= DEFAULT_SWIPE_CONFIG.MIN_SAMPLES;
  const isGood = display.gesture === 'Open_Palm' || display.gesture === 'Pointing_Up';

  return (
    <div className="dbg">
      <div className="dbg-title">🔍 DEBUG</div>

      <div className="dbg-row">
        <span className="lbl">gesture</span>
        <strong style={{ color: isGood ? '#00d9c0' : '#ff5a5f' }}>{display.gesture}</strong>
      </div>

      <div className="dbg-row">
        <span className="lbl">score</span>
        <span style={{ color: display.score >= DEFAULT_SWIPE_CONFIG.MIN_SCORE ? '#00d9c0' : '#ff5a5f' }}>
          {display.score.toFixed(2)}{' '}
          {display.score >= DEFAULT_SWIPE_CONFIG.MIN_SCORE ? '✓' : `✗ (≥${DEFAULT_SWIPE_CONFIG.MIN_SCORE})`}
        </span>
      </div>

      <div className="dbg-row">
        <span className="lbl">wrist x</span>
        <span>{display.x.toFixed(3)}</span>
      </div>

      <div className="dbg-row">
        <span className="lbl">deltaX</span>
        <span style={{ color: thresholdOk ? '#00d9c0' : '#aaa' }}>
          {display.deltaX >= 0 ? '+' : ''}
          {display.deltaX.toFixed(3)}{' '}
          {thresholdOk ? '✓' : `✗ (need ±${DEFAULT_SWIPE_CONFIG.DELTA_X_THRESHOLD})`}
        </span>
      </div>

      <div className="dbg-row">
        <span className="lbl">palm %</span>
        <span style={{ color: ratioOk ? '#00d9c0' : '#ff5a5f' }}>
          {(display.palmRatio * 100).toFixed(0)}%{' '}
          {ratioOk ? '✓' : `✗ (need ${DEFAULT_SWIPE_CONFIG.OPEN_PALM_RATIO * 100}%)`}
        </span>
      </div>

      <div className="dbg-row">
        <span className="lbl">buffer</span>
        <span style={{ color: bufferOk ? '#00d9c0' : '#aaa' }}>
          {display.bufferLen} {bufferOk ? '✓' : `✗ (need ${DEFAULT_SWIPE_CONFIG.MIN_SAMPLES})`}
        </span>
      </div>

      <div className="dbg-row">
        <span className="lbl">fps</span>
        <span>{display.fps}</span>
      </div>

      <div className="dbg-div" />

      <div className="dbg-row">
        <span className="lbl">swipe</span>
        <strong style={{ color: '#00d9c0', fontSize: 15 }}>{display.lastSwipe}</strong>
      </div>

      <style>{`
        .dbg {
          position: fixed;
          top: 16px;
          left: 16px;
          background: rgba(0,0,0,0.92);
          border: 2px solid #00d9c0;
          border-radius: 10px;
          padding: 14px 18px;
          font-size: 13px;
          color: #f5f5f5;
          z-index: 9999;
          min-width: 270px;
          line-height: 2;
          font-family: monospace;
          pointer-events: none;
        }
        .dbg-title {
          color: #00d9c0;
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 4px;
        }
        .dbg-row {
          display: flex;
          justify-content: space-between;
          gap: 16px;
        }
        .lbl { color: #888; min-width: 65px; }
        .dbg-div {
          border-top: 1px solid rgba(255,255,255,0.15);
          margin: 6px 0;
        }
      `}</style>
    </div>
  );
}
