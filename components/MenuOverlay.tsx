'use client';
import { useRef, useEffect } from 'react';

type Props = {
  titles: string[];
  currentPage: number;
  hoveredIndex: number | null;
  dwellProgress: number;
  scrollDelta: number; // 양수=아래, 음수=위
  onSelect: (index: number) => void;
};

export function MenuOverlay({ titles, currentPage, hoveredIndex, dwellProgress, scrollDelta, onSelect }: Props) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollDelta !== 0 && listRef.current) {
      listRef.current.scrollTop += scrollDelta;
    }
  }, [scrollDelta]);

  return (
    <div className="menu-overlay">
      <div className="menu-title">📋 목차</div>
      <div className="menu-hint">검지 가리키기 → 이동 &nbsp;|&nbsp; 위아래 → 스크롤</div>

      <div className="menu-list" ref={listRef}>
        {titles.map((title, i) => {
          const isHovered = hoveredIndex === i;
          const isCurrent = currentPage === i + 1;
          return (
            <div
              key={i}
              className={`menu-item${isCurrent ? ' current' : ''}${isHovered ? ' hovered' : ''}`}
              onClick={() => onSelect(i)}
            >
              <span className="menu-num">{i + 1}</span>
              <span className="menu-text">{title}</span>
              {isHovered && dwellProgress > 0 && (
                <svg className="dwell-gauge" viewBox="0 0 32 32">
                  <circle cx="16" cy="16" r="14" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                  <circle
                    cx="16" cy="16" r="14"
                    fill="none" stroke="#00d9c0" strokeWidth="3"
                    strokeDasharray={`${dwellProgress * 88} 88`}
                    strokeLinecap="round"
                    transform="rotate(-90 16 16)"
                  />
                </svg>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        .menu-overlay {
          position: fixed; top: 0; left: 0;
          width: 320px; height: 100vh;
          background: rgba(0,0,0,0.88);
          border-right: 1px solid rgba(0,217,192,0.4);
          z-index: 500; display: flex; flex-direction: column;
          padding: 24px 16px; gap: 12px;
          backdrop-filter: blur(12px);
          animation: slideIn 0.2s ease;
        }
        @keyframes slideIn {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .menu-title { font-size: 1.1rem; font-weight: 700; color: #00d9c0; }
        .menu-hint { font-size: 0.75rem; color: #888; margin-bottom: 4px; }
        .menu-list {
          flex: 1; overflow-y: auto;
          display: flex; flex-direction: column; gap: 4px;
          scrollbar-width: thin;
          scrollbar-color: rgba(0,217,192,0.3) transparent;
        }
        .menu-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border-radius: 8px;
          cursor: pointer; transition: background 0.15s;
          color: #ccc; font-size: 0.88rem; flex-shrink: 0;
        }
        .menu-item:hover, .menu-item.hovered { background: rgba(0,217,192,0.15); color: #fff; }
        .menu-item.current { color: #00d9c0; font-weight: 600; }
        .menu-num { min-width: 24px; font-size: 0.75rem; color: #666; text-align: right; }
        .menu-item.current .menu-num { color: #00d9c0; }
        .menu-text { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .dwell-gauge { width: 28px; height: 28px; flex-shrink: 0; }
      `}</style>
    </div>
  );
}
