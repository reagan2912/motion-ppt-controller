'use client';
import type { RefObject } from 'react';
import { CAMERA_PREVIEW_W, CAMERA_PREVIEW_H } from '@/lib/domain/config';

type Props = { videoRef: RefObject<HTMLVideoElement>; };

export function CameraPreview({ videoRef }: Props) {
  return (
    <div className="camera-preview-wrapper">
      <div className="camera-preview-label">LIVE</div>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        width={CAMERA_PREVIEW_W}
        height={CAMERA_PREVIEW_H}
        style={{ transform: 'scaleX(-1)', display: 'block' }}
      />
      <style>{`
        .camera-preview-wrapper {
          position: fixed;
          top: 16px;
          right: 16px;
          width: ${CAMERA_PREVIEW_W}px;
          height: ${CAMERA_PREVIEW_H}px;
          border: 2px solid rgba(253,81,8,0.6);
          border-radius: 4px;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(0,0,0,0.6);
          background: #111;
          z-index: 100;
        }
        .camera-preview-wrapper video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .camera-preview-label {
          position: absolute;
          top: 6px;
          left: 8px;
          font-size: 9px;
          font-weight: 700;
          color: #FD5108;
          font-family: Arial, sans-serif;
          letter-spacing: 1px;
          z-index: 1;
          background: rgba(0,0,0,0.5);
          padding: 1px 5px;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}
