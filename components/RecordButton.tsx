'use client';
import type { RecordStatus } from '@/lib/application/useScreenRecorder';

type Props = {
  status: RecordStatus;
  onToggle: () => void;
};

export function RecordButton({ status, onToggle }: Props) {
  const isRecording = status === 'recording';

  return (
    <div className="record-wrapper">
      {isRecording && <div className="record-badge">REC</div>}
      <button
        className={`record-btn${isRecording ? ' recording' : ''}`}
        onClick={onToggle}
        disabled={status === 'unsupported'}
        title={isRecording ? '녹화 중지' : '화면 녹화 시작'}
      >
        {/* 녹화 아이콘: 원 */}
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          {isRecording ? (
            // 정지 아이콘 (■)
            <rect x="4" y="4" width="10" height="10" rx="2" fill="#DC2626"/>
          ) : (
            // 녹화 아이콘 (●)
            <circle cx="9" cy="9" r="6" fill="#DC2626"/>
          )}
        </svg>
      </button>

      <style>{`
        .record-wrapper {
          position: fixed;
          bottom: 148px;
          right: 16px;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
          z-index: 200;
        }
        .record-badge {
          font-size: 9px;
          font-weight: 700;
          color: #DC2626;
          font-family: Arial, sans-serif;
          letter-spacing: 1px;
          background: rgba(0,0,0,0.7);
          padding: 2px 6px;
          border-radius: 3px;
          animation: blink 1s infinite;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .record-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(50,50,50,0.85);
          border: 1.5px solid rgba(255,255,255,0.25);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s, border-color 0.2s;
        }
        .record-btn:hover { background: rgba(220,38,38,0.3); border-color: #DC2626; }
        .record-btn.recording {
          border-color: #DC2626;
          background: rgba(50,50,50,0.85);
          animation: pulse-red 1.5s infinite;
        }
        .record-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        @keyframes pulse-red {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.4); }
          50% { box-shadow: 0 0 0 8px rgba(220,38,38,0); }
        }
      `}</style>
    </div>
  );
}
