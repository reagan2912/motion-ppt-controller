'use client';
import { useState, useRef, useCallback } from 'react';

export type RecordStatus = 'idle' | 'recording' | 'error' | 'unsupported';

export function useScreenRecorder() {
  const [status, setStatus] = useState<RecordStatus>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const nav = navigator as Navigator & { mediaDevices?: MediaDevices };
    if (!nav.mediaDevices || !('getDisplayMedia' in nav.mediaDevices)) {
      alert('이 브라우저는 화면 녹화를 지원하지 않습니다.\nChrome 또는 Edge를 사용해주세요.');
      setStatus('unsupported');
      return;
    }

    try {
      // 1. 화면 스트림
      const displayStream = await (navigator.mediaDevices as MediaDevices & {
        getDisplayMedia: (c: object) => Promise<MediaStream>;
      }).getDisplayMedia({ video: { frameRate: 30 }, audio: true });

      // 2. 마이크 스트림
      let micStream: MediaStream | null = null;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } catch {
        console.warn('마이크 권한 없음 — 화면 오디오만 녹화');
      }

      // 3. AudioContext로 화면오디오 + 마이크 믹싱
      const audioCtx = new AudioContext();
      const destination = audioCtx.createMediaStreamDestination();

      // 화면 오디오 트랙 연결
      const displayAudioTracks = displayStream.getAudioTracks();
      if (displayAudioTracks.length > 0) {
        const displayAudioStream = new MediaStream(displayAudioTracks);
        audioCtx.createMediaStreamSource(displayAudioStream).connect(destination);
      }

      // 마이크 오디오 트랙 연결
      if (micStream) {
        audioCtx.createMediaStreamSource(micStream).connect(destination);
      }

      // 4. 최종 스트림 = 화면 비디오 + 믹싱된 오디오
      const finalStream = new MediaStream([
        ...displayStream.getVideoTracks(),
        ...destination.stream.getAudioTracks(),
      ]);

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm';

      const recorder = new MediaRecorder(finalStream, { mimeType, videoBitsPerSecond: 2_500_000 });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const ts = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
        const a = document.createElement('a');
        a.href = url;
        a.download = `presentation-${ts}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 3000);
        displayStream.getTracks().forEach((t) => t.stop());
        micStream?.getTracks().forEach((t) => t.stop());
        audioCtx.close();
        mediaRecorderRef.current = null;
        setStatus('idle');
      };

      // 브라우저 공유 중지 버튼 클릭 시
      displayStream.getVideoTracks().forEach((t) => {
        t.addEventListener('ended', () => {
          if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
          setStatus('idle');
        });
      });

      recorder.start(500);
      mediaRecorderRef.current = recorder;
      setStatus('recording');
    } catch (e) {
      if (e instanceof Error) {
        if (e.name === 'NotAllowedError' || e.name === 'AbortError') {
          setStatus('idle');
        } else {
          console.error('녹화 오류:', e);
          setStatus('error');
        }
      }
    }
  }, []);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const toggle = useCallback(() => {
    if (status === 'recording') stop();
    else start();
  }, [status, start, stop]);

  return { status, toggle };
}
