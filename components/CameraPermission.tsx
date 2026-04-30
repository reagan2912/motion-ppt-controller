'use client';
import { useState, useCallback } from 'react';

type CameraErrorKind = 'permission_denied' | 'not_found' | 'in_use' | 'unknown';

function classifyCameraError(err: unknown): CameraErrorKind {
  if (!(err instanceof Error)) return 'unknown';
  if (err.name === 'NotAllowedError') return 'permission_denied';
  if (err.name === 'NotFoundError') return 'not_found';
  if (err.name === 'NotReadableError') return 'in_use';
  return 'unknown';
}

type CameraStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'not_found';

type Props = {
  onGranted: (stream: MediaStream) => void;
  onError?: (kind: CameraErrorKind) => void;
};

const ERROR_MESSAGES: Record<string, string> = {
  permission_denied: '카메라 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.',
  not_found: '웹캠을 찾을 수 없습니다. USB 카메라를 연결하거나 내장 카메라를 확인해주세요.',
  in_use: '카메라가 다른 앱에서 사용 중입니다.',
  unknown: '카메라를 시작할 수 없습니다.',
};

export function CameraPermission({ onGranted, onError }: Props) {
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [errMsg, setErrMsg] = useState('');

  const requestPermission = useCallback(async () => {
    setStatus('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });
      setStatus('granted');
      onGranted(stream);
    } catch (e) {
      const kind = classifyCameraError(e);
      setStatus(kind === 'not_found' ? 'not_found' : 'denied');
      setErrMsg(ERROR_MESSAGES[kind] ?? ERROR_MESSAGES['unknown'] ?? '');
      onError?.(kind);
    }
  }, [onGranted, onError]);

  if (status === 'granted') {
    return (
      <div className="cam-status granted">
        <span className="cam-dot" />
        카메라 허용됨
      </div>
    );
  }

  return (
    <div className="cam-permission">
      {status === 'idle' || status === 'requesting' ? (
        <button className="cam-btn" onClick={requestPermission} disabled={status === 'requesting'}>
          {status === 'requesting' ? '요청 중...' : '📷 카메라 권한 요청'}
        </button>
      ) : (
        <div className="cam-error">
          <span>{errMsg}</span>
          <button className="cam-btn secondary" onClick={requestPermission}>
            다시 시도
          </button>
        </div>
      )}

      <style>{`
        .cam-status { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; }
        .cam-status.granted { color: var(--accent); }
        .cam-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--accent); display: inline-block;
        }
        .cam-permission { display: flex; flex-direction: column; gap: 8px; }
        .cam-btn {
          padding: 10px 20px;
          background: var(--accent);
          color: #000;
          border: none;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .cam-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .cam-btn.secondary {
          background: transparent;
          color: var(--accent);
          border: 1px solid var(--accent);
          margin-top: 6px;
        }
        .cam-error { display: flex; flex-direction: column; gap: 4px; }
        .cam-error span { color: var(--error); font-size: 0.85rem; }
      `}</style>
    </div>
  );
}
