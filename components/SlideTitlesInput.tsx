'use client';
// 목차용 슬라이드 제목 입력
// 페이지 수만큼 자동으로 입력란 생성

type Props = {
  pageCount: number;
  titles: string[];
  onChange: (titles: string[]) => void;
};

export function SlideTitlesInput({ pageCount, titles, onChange }: Props) {
  const handleChange = (index: number, value: string) => {
    const next = [...titles];
    next[index] = value;
    onChange(next);
  };

  // 자동으로 기본값 채우기
  const displayTitles = Array.from(
    { length: pageCount },
    (_, i) => titles[i] ?? `슬라이드 ${i + 1}`,
  );

  return (
    <div className="titles-input">
      <div className="titles-label">📋 목차 제목 입력 <span>(선택사항)</span></div>
      <div className="titles-hint">비워두면 "슬라이드 N"으로 표시됩니다</div>
      <div className="titles-list">
        {displayTitles.map((title, i) => (
          <div key={i} className="titles-row">
            <span className="titles-num">{i + 1}</span>
            <input
              className="titles-field"
              value={titles[i] ?? ''}
              placeholder={`슬라이드 ${i + 1}`}
              onChange={(e) => handleChange(i, e.target.value)}
            />
          </div>
        ))}
      </div>

      <style>{`
        .titles-input { display: flex; flex-direction: column; gap: 8px; }
        .titles-label { font-size: 0.9rem; font-weight: 600; color: var(--fg); }
        .titles-label span { font-weight: 400; color: var(--muted); font-size: 0.8rem; }
        .titles-hint { font-size: 0.78rem; color: var(--muted); }
        .titles-list {
          max-height: 200px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding-right: 4px;
        }
        .titles-row { display: flex; align-items: center; gap: 8px; }
        .titles-num { min-width: 24px; font-size: 0.78rem; color: var(--muted); text-align: right; }
        .titles-field {
          flex: 1;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 0.85rem;
          color: var(--fg);
          outline: none;
          font-family: inherit;
        }
        .titles-field:focus { border-color: var(--accent); }
        .titles-field::placeholder { color: var(--muted); }
      `}</style>
    </div>
  );
}
