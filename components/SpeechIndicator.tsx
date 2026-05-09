'use client';
import type { SpeechStatus } from '@/lib/application/useSpeechRecognition';

type Props = {
  status: SpeechStatus;
  lastHeard: string;
  enabled: boolean;
  onToggle: () => void;
};

// 음파 SVG 아이콘 (이미지처럼 파형 모양)
function WaveIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="8" width="2.5" height="6" rx="1.25" fill="#fff" opacity="0.7" />
      <rect x="5" y="4" width="2.5" height="14" rx="1.25" fill="#fff" opacity="0.85" />
      <rect x="9" y="1" width="2.5" height="20" rx="1.25" fill="#fff" />
      <rect x="13" y="4" width="2.5" height="14" rx="1.25" fill="#fff" opacity="0.85" />
      <rect x="17" y="8" width="2.5" height="6" rx="1.25" fill="#fff" opacity="0.7" />
    </svg>
  );
}

export function SpeechIndicator({ status, lastHeard, enabled, onToggle }: Props) {
  const isListening = status === 'listening';

  return (
    <div className="speech-wrapper">
      {isListening && lastHeard && (
        <div className="speech-heard">"{lastHeard}"</div>
      )}
      <button
        className={`speech-btn${isListening ? ' listening' : ''}${status === 'error' || status === 'unsupported' ? ' error' : ''}`}
        onClick={onToggle}
        disabled={status === 'unsupported'}
        title={isListening ? '음성 인식 중 — 클릭해서 끄기' : '음성 인식 켜기'}
      >
        <WaveIcon />
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
          position: fixed;
          bottom: 196px;
          right: 16px;
          background: rgba(0,0,0,0.85);
          color: #22c55e;
          font-size: 0.78rem;
          padding: 3px 10px;
          border-radius: 12px;
          max-width: 160px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-family: Arial, sans-serif;
          border: 1px solid rgba(34,197,94,0.3);
        }
        .speech-btn {
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
        .speech-btn:hover {
          background: rgba(253,81,8,0.35);
          border-color: #FD5108;
        }
        .speech-btn.listening {
          background: rgba(50,50,50,0.85);
          border-color: #FD5108;
          border-width: 2px;
          animation: pulse-orange 1.5s infinite;
        }
        .speech-btn.error {
          background: rgba(50,50,50,0.85);
          border-color: #DC2626;
        }
        .speech-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        @keyframes pulse-orange {
          0%, 100% { box-shadow: 0 0 0 0 rgba(253,81,8,0.5); }
          50% { box-shadow: 0 0 0 8px rgba(253,81,8,0); }
        }
      `}</style>
    </div>
  );
}
