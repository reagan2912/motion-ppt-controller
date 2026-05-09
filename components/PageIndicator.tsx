'use client';

type Props = {
  current: number;
  total: number;
  gesture?: string;
};

export function PageIndicator({ current, total, gesture }: Props) {
  return (
    <div className="page-indicator">
      {gesture && gesture !== 'None' && (
        <div className="gesture-label">{gesture}</div>
      )}
      <div className="page-num">
        <span className="page-current">{current}</span>
        <span className="page-sep"> / </span>
        <span className="page-total">{total}</span>
      </div>

      <style>{`
        .page-indicator {
          position: fixed;
          bottom: 16px;
          left: 16px;
          font-family: Arial, sans-serif;
          background: rgba(0,0,0,0.72);
          padding: 6px 12px;
          border-radius: 4px;
          z-index: 100;
          border-left: 3px solid #FD5108;
          color: #fff;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .gesture-label {
          font-size: 11px;
          color: #22c55e;
          font-weight: 600;
          letter-spacing: 0.3px;
        }
        .page-num { font-size: 13px; letter-spacing: 0.5px; }
        .page-current { color: #FD5108; font-weight: 700; }
        .page-sep { color: #A1A8B3; margin: 0 2px; }
        .page-total { color: #fff; }
      `}</style>
    </div>
  );
}
