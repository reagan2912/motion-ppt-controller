'use client';
import { useState, useCallback } from 'react';

type MicStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported';

type Props = {
  onGranted: () => void;
  onError?: () => void;
};

export function MicPermission({ onGranted, onError }: Props) {
  const [status, setStatus] = useState<MicStatus>('idle');

  const requestPermission = useCallback(async () => {
    // Web Speech API 지원 여부 확인
    const SpeechRecognition =
      window.SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition: typeof window.SpeechRecognition })
        .webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatus('unsupported');
      onError?.();
      return;
    }

    setStatus('requesting');
    try {
      // 마이크 권한 요청
      await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setStatus('granted');
      onGranted();
    } catch {
      setStatus('denied');
      onError?.();
    }
  }, [onGranted, onError]);

  if (status === 'granted') {
    return (
      <div className="mic-status granted">
        <span className="mic-dot" />
        마이크 허용됨
        <style>{`
          .mic-status { display:flex; align-items:center; gap:8px; font-size:0.9rem; }
          .mic-status.granted { color: var(--accent); }
          .mic-dot { width:8px; height:8px; border-radius:50%; background:var(--accent); display:inline-block; }
        `}</style>
      </div>
    );
  }

  if (status === 'unsupported') {
    return (
      <div className="mic-unsupported">
        🎤 음성 인식은 Chrome/Edge에서만 지원됩니다
        <style>{`.mic-unsupported { color:var(--muted); font-size:0.85rem; }`}</style>
      </div>
    );
  }

  return (
    <div className="mic-permission">
      {status === 'denied' && (
        <div className="mic-error">마이크 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.</div>
      )}
      <button
        className="mic-btn"
        onClick={requestPermission}
        disabled={status === 'requesting'}
      >
        {status === 'requesting' ? '요청 중...' : '🎤 마이크 권한 요청'}
      </button>
      {status !== 'denied' && null}

      <style>{`
        .mic-permission { display:flex; flex-direction:column; gap:6px; }
        .mic-btn {
          padding:10px 20px;
          background:var(--accent);
          color:#fff;
          border:none;
          border-radius:8px;
          font-size:0.9rem;
          font-weight:600;
          cursor:pointer;
          transition:opacity 0.2s;
          width:100%;
        }
        .mic-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .mic-error { color:var(--error); font-size:0.82rem; }
        .mic-optional { color:var(--muted); font-size:0.78rem; text-align:center; }
      `}</style>
    </div>
  );
}
