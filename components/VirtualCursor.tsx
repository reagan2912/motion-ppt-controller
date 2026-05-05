'use client';
// 가상 커서 — 검지 끝 좌표를 화면에 표시

type Props = {
  x: number; // 화면 픽셀 좌표
  y: number;
  dwellProgress: number; // 0~1
  visible: boolean;
};

export function VirtualCursor({ x, y, dwellProgress, visible }: Props) {
  if (!visible) return null;

  const r = 18;
  const circumference = 2 * Math.PI * r;

  return (
    <div
      className="cursor-wrapper"
      style={{ transform: `translate(${x}px, ${y}px)` }}
    >
      {/* 외곽 dwell 게이지 */}
      <svg
        className="cursor-svg"
        width={r * 2 + 8}
        height={r * 2 + 8}
        style={{ position: 'absolute', top: -(r + 4), left: -(r + 4) }}
      >
        <circle
          cx={r + 4} cy={r + 4} r={r}
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="2.5"
        />
        <circle
          cx={r + 4} cy={r + 4} r={r}
          fill="none"
          stroke="#00d9c0"
          strokeWidth="2.5"
          strokeDasharray={`${dwellProgress * circumference} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${r + 4} ${r + 4})`}
          style={{ transition: 'stroke-dasharray 0.05s linear' }}
        />
      </svg>

      {/* 커서 점 */}
      <div className="cursor-dot" />

      <style>{`
        .cursor-wrapper {
          position: fixed;
          top: 0; left: 0;
          pointer-events: none;
          z-index: 600;
          will-change: transform;
        }
        .cursor-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #00d9c0;
          box-shadow: 0 0 8px #00d9c0;
          position: absolute;
          top: -5px;
          left: -5px;
        }
      `}</style>
    </div>
  );
}
