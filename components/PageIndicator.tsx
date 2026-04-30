'use client';

type Props = {
  current: number;
  total: number;
};

export function PageIndicator({ current, total }: Props) {
  return (
    <div className="page-indicator">
      {current} / {total}
      <style>{`
        .page-indicator {
          position: fixed;
          bottom: 16px;
          left: 16px;
          font-size: 14px;
          color: var(--fg);
          background: rgba(0,0,0,0.45);
          padding: 4px 10px;
          border-radius: 6px;
          z-index: 100;
          backdrop-filter: blur(4px);
        }
      `}</style>
    </div>
  );
}
