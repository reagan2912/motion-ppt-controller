'use client';
import type { RefObject } from 'react';
import { CAMERA_PREVIEW_W, CAMERA_PREVIEW_H } from '@/lib/domain/config';

type Props = {
  videoRef: RefObject<HTMLVideoElement>;
};

/**
 * 우상단 카메라 프리뷰 — 미러링(scaleX(-1)) 적용해 사용자 직관적으로 표시.
 * MediaPipe 입력은 원본 그대로 (§5.5 참조).
 */
export function CameraPreview({ videoRef }: Props) {
  return (
    <div className="camera-preview-wrapper">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        width={CAMERA_PREVIEW_W}
        height={CAMERA_PREVIEW_H}
        style={{
          transform: 'scaleX(-1)',
          display: 'block',
        }}
      />
      <style>{`
        .camera-preview-wrapper {
          position: fixed;
          top: 16px;
          right: 16px;
          width: ${CAMERA_PREVIEW_W}px;
          height: ${CAMERA_PREVIEW_H}px;
          border: 1px solid rgba(255,255,255,0.4);
          border-radius: 6px;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(0,0,0,0.5);
          background: #111;
          z-index: 100;
        }
        .camera-preview-wrapper video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      `}</style>
    </div>
  );
}
