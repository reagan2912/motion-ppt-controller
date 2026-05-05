import { describe, it, expect } from 'vitest';
import { createInitialState, detectSwipe } from '@/lib/domain/swipeDetector';
import { DEFAULT_SWIPE_CONFIG } from '@/lib/domain/config';
import type { Sample, SwipeConfig } from '@/lib/domain/types';

// 헬퍼: Open_Palm 샘플 배열 생성
function makeSamples(
  count: number,
  opts: {
    startX?: number;
    endX?: number;
    gesture?: Sample['gesture'];
    score?: number;
    startT?: number;
    intervalMs?: number;
  } = {},
): Sample[] {
  const {
    startX = 0.3,
    endX = 0.6,
    gesture = 'Open_Palm',
    score = 0.9,
    startT = 0,
    intervalMs = 50,
  } = opts;
  return Array.from({ length: count }, (_, i) => ({
    t: startT + i * intervalMs,
    x: startX + ((endX - startX) * i) / Math.max(count - 1, 1),
    y: 0.5,
    indexX: startX + ((endX - startX) * i) / Math.max(count - 1, 1),
    indexY: 0.5,
    gesture,
    score,
  }));
}

const cfg = DEFAULT_SWIPE_CONFIG;

// 샘플 배열을 초기 상태에서 순차 실행하고 마지막 결과 반환
function runSamples(samples: Sample[], config: SwipeConfig) {
  return samples.reduce(
    (acc, s) => detectSwipe(acc.state, s, config),
    { state: createInitialState(), swipe: null } as ReturnType<typeof detectSwipe>,
  );
}

describe('createInitialState', () => {
  it('빈 버퍼와 cooldownUntil=0을 반환한다', () => {
    const s = createInitialState();
    expect(s.buffer).toHaveLength(0);
    expect(s.cooldownUntil).toBe(0);
  });
});

describe('detectSwipe', () => {
  // T-01: 빈 buffer + 1 sample → null
  it('T-01: 버퍼가 1개면 swipe=null, buffer에 샘플 1개', () => {
    const state = createInitialState();
    const sample: Sample = { t: 100, x: 0.5, y: 0.5, indexX: 0.5, indexY: 0.5, gesture: 'Open_Palm', score: 0.9 };
    const result = detectSwipe(state, sample, cfg);
    expect(result.swipe).toBeNull();
    expect(result.state.buffer).toHaveLength(1);
  });

  // T-02: 5개 Open_Palm, x: 0.2→0.5 (delta=+0.3) → swipe='right'
  it('T-02: 충분한 우방향 이동 → swipe=right, buffer 초기화, cooldown 설정', () => {
    const samples = makeSamples(5, { startX: 0.2, endX: 0.5 });
    const result = runSamples(samples, cfg);
    expect(result.swipe).toBe('right');
    expect(result.state.buffer).toHaveLength(0);
    const lastT = samples[samples.length - 1]?.t ?? 0;
    expect(result.state.cooldownUntil).toBe(lastT + cfg.COOLDOWN_MS);
  });

  // T-03: x: 0.7→0.4 (delta=-0.3) → swipe='left'
  it('T-03: 충분한 좌방향 이동 → swipe=left', () => {
    const result = runSamples(makeSamples(5, { startX: 0.7, endX: 0.4 }), cfg);
    expect(result.swipe).toBe('left');
  });

  // T-04: delta=+0.1 (< threshold) → swipe=null
  it('T-04: deltaX가 임계 미만이면 swipe=null', () => {
    const result = runSamples(makeSamples(5, { startX: 0.4, endX: 0.5 }), cfg);
    expect(result.swipe).toBeNull();
  });

  // T-05: 5개 중 2개만 Open_Palm (ratio=0.4 < 0.7) → null
  it('T-05: Open_Palm 비율이 임계 미만이면 swipe=null', () => {
    const mixed: Sample[] = [
      { t: 0, x: 0.2, y: 0.5, indexX: 0.2, indexY: 0.5, gesture: 'Open_Palm', score: 0.9 },
      { t: 50, x: 0.25, y: 0.5, indexX: 0.25, indexY: 0.5, gesture: 'Closed_Fist', score: 0.9 },
      { t: 100, x: 0.3, y: 0.5, indexX: 0.3, indexY: 0.5, gesture: 'Closed_Fist', score: 0.9 },
      { t: 150, x: 0.4, y: 0.5, indexX: 0.4, indexY: 0.5, gesture: 'Closed_Fist', score: 0.9 },
      { t: 200, x: 0.5, y: 0.5, indexX: 0.5, indexY: 0.5, gesture: 'Open_Palm', score: 0.9 },
    ];
    expect(runSamples(mixed, cfg).swipe).toBeNull();
  });

  // T-06: score=0.5 (< MIN_SCORE) → Open_Palm으로 카운트 안 됨 → null
  it('T-06: score가 MIN_SCORE 미만이면 Open_Palm으로 카운트 안 됨', () => {
    const result = runSamples(makeSamples(5, { startX: 0.2, endX: 0.5, score: 0.5 }), cfg);
    expect(result.swipe).toBeNull();
  });

  // T-07: 쿨다운 중 → null, buffer 초기화
  it('T-07: 쿨다운 중에는 swipe=null이고 buffer는 빈 배열', () => {
    // 쿨다운이 설정된 상태 직접 생성
    const frozenState = { buffer: [], cooldownUntil: 9999 };
    const sample: Sample = { t: 100, x: 0.5, y: 0.5, indexX: 0.5, indexY: 0.5, gesture: 'Open_Palm', score: 0.9 };
    const result = detectSwipe(frozenState, sample, cfg);
    expect(result.swipe).toBeNull();
    expect(result.state.buffer).toHaveLength(0);
  });

  // T-08: 윈도우 외 샘플은 제거됨
  it('T-08: WINDOW_MS 밖의 샘플은 제거된다', () => {
    // 아주 오래된 샘플 1개 먼저 통과
    const old: Sample = { t: 0, x: 0.1, y: 0.5, indexX: 0.1, indexY: 0.5, gesture: 'Open_Palm', score: 0.9 };
    const afterOld = detectSwipe(createInitialState(), old, cfg);
    // 600ms 후 새 샘플들 (WINDOW_MS=500 → 오래된 샘플은 제거됨)
    const fresh = makeSamples(5, { startX: 0.2, endX: 0.5, startT: 600 });
    const result = fresh.reduce(
      (acc, s) => detectSwipe(acc.state, s, cfg),
      afterOld,
    );
    expect(result.swipe).toBe('right');
  });

  // T-09: INVERT_DIRECTION=true, delta=+0.3 → swipe='left' (반전)
  it('T-09: INVERT_DIRECTION=true이면 방향이 반전된다', () => {
    const invertedCfg: SwipeConfig = { ...cfg, INVERT_DIRECTION: true };
    const result = runSamples(makeSamples(5, { startX: 0.2, endX: 0.5 }), invertedCfg);
    expect(result.swipe).toBe('left');
  });

  // T-10: MIN_SAMPLES=5, 4개만 모음 → null
  it('T-10: 샘플이 MIN_SAMPLES 미만이면 swipe=null', () => {
    const result = runSamples(makeSamples(4, { startX: 0.2, endX: 0.5 }), cfg);
    expect(result.swipe).toBeNull();
  });

  // T-11: 스와이프 후 cooldownUntil = sample.t + COOLDOWN_MS
  it('T-11: 스와이프 후 cooldownUntil이 올바르게 설정된다', () => {
    const samples = makeSamples(5, { startX: 0.2, endX: 0.5, startT: 1000 });
    const result = runSamples(samples, cfg);
    const lastT = samples[samples.length - 1]?.t ?? 0;
    expect(result.state.cooldownUntil).toBe(lastT + cfg.COOLDOWN_MS);
  });

  // T-12: 스와이프 후 buffer는 빈 배열
  it('T-12: 스와이프 발사 후 buffer는 비워진다', () => {
    const result = runSamples(makeSamples(5, { startX: 0.2, endX: 0.5 }), cfg);
    expect(result.state.buffer).toHaveLength(0);
  });

  // T-13: 동일 t 샘플 여러 개 — 안정적으로 처리
  it('T-13: 동일 timestamp 샘플도 안정적으로 처리된다', () => {
    const sameT: Sample[] = Array.from({ length: 5 }, (_, i) => ({
      t: 100,
      x: 0.2 + i * 0.07,
      y: 0.5,
      indexX: 0.2 + i * 0.07,
      indexY: 0.5,
      gesture: 'Open_Palm' as const,
      score: 0.9,
    }));
    expect(() => runSamples(sameT, cfg)).not.toThrow();
  });

  // T-14: x가 [0,1] 밖이어도 swipe 발사 (방어 코드 없이도 정상)
  it('T-14: x가 [0,1] 밖이어도 안정적으로 swipe를 판정한다', () => {
    // delta=0.1 < threshold → null
    expect(runSamples(makeSamples(5, { startX: 0.95, endX: 1.05 }), cfg).swipe).toBeNull();
    // delta=0.35 > threshold → right
    expect(runSamples(makeSamples(5, { startX: 0.7, endX: 1.05 }), cfg).swipe).toBe('right');
  });
});
