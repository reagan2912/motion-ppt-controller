'use client';
import type { SpeechStatus } from '@/lib/application/useSpeechRecognition';

type Props = {
  status: SpeechStatus;
  lastHeard: string;
  enabled: boolean;
  onToggle: () => void;
};

const STATUS_ICON: Record<SpeechStatus, string> = {
  idle: '🎤',
  listening: '🔴',
  error: '🎤✕',
  unsupported: '🎤✕',
};

const STATUS_LABEL: Record<SpeechStatus, string> = {
  idle: '음성 꺼짐',
  listening: '음성 인식 중',
  error: '음성 오류',
  unsupported: '미지원 브라우저',
};

export function SpeechIndicator({ status, lastHeard, enabled, onToggle }: Props) {
  return (
    <div className="speech-wrapper">
      {/* 마지막으로 인식된 단어 */}
      {status === 'listening' && lastHeard && (
        <div className="speech-heard">"{lastHeard}"</div>
      )}

      {/* 마이크 토글 버튼 */}
      <button
        className={`speech-btn${status === 'listening' ? ' listening' : ''}${status === 'error' || status === 'unsupported' ? ' error' : ''}`}
        onClick={onToggle}
        title={STATUS_LABEL[status]}
        disabled={status === 'unsupported'}
      >
        {STATUS_ICON[status]}
      </button>

      <style>{`
        .speech-wrapper {
          position: fixed;
          bottom: 104px;
          right: 16px;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
          z-index: 200;
        }
        .speech-heard {
          background: rgba(0,0,0,0.75);
          color: #00d9c0;
          font-size: 0.8rem;
          padding: 4px 10px;
          border-radius: 12px;
          max-width: 160px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .speech-btn {
          width: 44px; height: 44px;
          border-radius: 50%;
          background: rgba(0,0,0,0.6);
          border: 1px solid rgba(255,255,255,0.3);
          color: var(--fg);
          font-size: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }
        .speech-btn.listening {
          background: rgba(0,217,192,0.25);
          border-color: #00d9c0;
          animation: pulse 1.5s infinite;
        }
        .speech-btn.error {
          background: rgba(255,90,95,0.4);
          border-color: var(--error);
        }
        .speech-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0,217,192,0.4); }
          50% { box-shadow: 0 0 0 8px rgba(0,217,192,0); }
        }
      `}</style>
    </div>
  );
}
