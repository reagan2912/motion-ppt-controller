'use client';
import { useRef, useEffect } from 'react';

type Props = {
  titles: string[];
  currentPage: number;
  hoveredIndex: number | null;
  dwellProgress: number;
  scrollDelta: number;
  onSelect: (index: number) => void;
};

export function MenuOverlay({ titles, currentPage, hoveredIndex, dwellProgress, scrollDelta, onSelect }: Props) {
  const listRef = useRef<HTMLDivElement>(null);

  // 손가락 스크롤
  useEffect(() => {
    if (scrollDelta !== 0 && listRef.current) {
      listRef.current.scrollTop += scrollDelta;
    }
  }, [scrollDelta]);

  // 키보드 위아래 스크롤 (목차 열려있을 때)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!listRef.current) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        listRef.current.scrollTop += 80;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        listRef.current.scrollTop -= 80;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div className="menu-overlay">
      <div className="menu-title">목차</div>
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
                  <circle cx="16" cy="16" r="14" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
                  <circle cx="16" cy="16" r="14" fill="none" stroke="#FD5108" strokeWidth="3"
                    strokeDasharray={`${dwellProgress * 88} 88`} strokeLinecap="round"
                    transform="rotate(-90 16 16)" />
                </svg>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        .menu-overlay {
          position: fixed; top: 0; left: 0;
          width: 300px; height: 100vh;
          background: #000;
          border-right: 3px solid #FD5108;
          z-index: 500;
          display: flex; flex-direction: column;
          padding: 20px 14px;
          gap: 10px;
          animation: slideIn 0.2s ease;
        }
        @keyframes slideIn {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .menu-logo { margin-bottom: 4px; }
        .menu-title {
          font-family: Georgia, Noto Serif KR, serif;
          font-size: 1rem;
          font-weight: 700;
          color: #fff;
          border-bottom: 1px solid rgba(253,81,8,0.3);
          padding-bottom: 10px;
        }
        .menu-hint { font-size: 0.72rem; color: #A1A8B3; font-family: Arial, sans-serif; }
        .menu-list {
          flex: 1; overflow-y: auto;
          display: flex; flex-direction: column; gap: 2px;
          scrollbar-width: thin;
          scrollbar-color: rgba(253,81,8,0.3) transparent;
        }
        .menu-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 10px;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.15s;
          color: #A1A8B3;
          font-size: 0.85rem;
          font-family: Arial, Noto Sans KR, sans-serif;
          flex-shrink: 0;
        }
        .menu-item:hover, .menu-item.hovered {
          background: rgba(253,81,8,0.15);
          color: #fff;
        }
        .menu-item.current {
          color: #FD5108;
          font-weight: 700;
          background: rgba(253,81,8,0.08);
        }
        .menu-num { min-width: 22px; font-size: 0.72rem; color: rgba(253,81,8,0.6); text-align: right; }
        .menu-item.current .menu-num { color: #FD5108; }
        .menu-text { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .dwell-gauge { width: 26px; height: 26px; flex-shrink: 0; }
      `}</style>
    </div>
  );
}
