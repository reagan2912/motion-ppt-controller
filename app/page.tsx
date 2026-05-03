'use client';
import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type RefObject,
} from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { PdfDropzone } from '@/components/PdfDropzone';
import { CameraPermission } from '@/components/CameraPermission';
import { PdfViewer } from '@/components/PdfViewer';
import { CameraPreview } from '@/components/CameraPreview';
import { GestureController } from '@/components/GestureController';
import { SwipeFeedback } from '@/components/SwipeFeedback';
import { PageIndicator } from '@/components/PageIndicator';
import { DebugOverlay } from '@/components/DebugOverlay';
import { usePdfDocument } from '@/lib/application/usePdfDocument';
import { useKeyboardNav } from '@/lib/application/useKeyboardNav';
import type { SwipeDirection, Sample } from '@/lib/domain/types';
import type { LoopStatus, LoopError } from '@/lib/application/useGestureLoop';

type AppMode = 'idle' | 'present';

function isSupportedBrowser(): boolean {
  if (typeof navigator === 'undefined') return true;
  return 'mediaDevices' in navigator;
}

function PresentationApp() {
  const searchParams = useSearchParams();
  const isDebug = searchParams.get('debug') === '1';

  const [mode, setMode] = useState<AppMode>('idle');
  const [cameraGranted, setCameraGranted] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [gestureStatus, setGestureStatus] = useState<LoopStatus>('idle');
  const [swipeTrigger, setSwipeTrigger] = useState<SwipeDirection | 'boundary' | null>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [unsupported, setUnsupported] = useState(false);
  const [cameraOn, setCameraOn] = useState(true); // 카메라 ON/OFF 상태

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debugSampleSetterRef = useRef<((s: Sample) => void) | null>(null);

  const pdfDoc = usePdfDocument();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(el);
    setContainerWidth(el.clientWidth);
    return () => observer.disconnect();
  }, [mode]);

  useEffect(() => {
    setUnsupported(!isSupportedBrowser());
  }, []);

  const [tabVisible, setTabVisible] = useState(true);
  useEffect(() => {
    const handleVisibility = () => setTabVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const gestureEnabled = mode === 'present' && tabVisible && cameraOn;

  const handleSwipe = useCallback(
    (dir: SwipeDirection) => {
      const { currentPage, pageCount } = pdfDoc.state;
      if (dir === 'right') {
        if (currentPage >= pageCount) {
          setSwipeTrigger('boundary');
        } else {
          pdfDoc.goNext();
          setSwipeTrigger('right');
        }
      } else {
        if (currentPage <= 1) {
          setSwipeTrigger('boundary');
        } else {
          pdfDoc.goPrev();
          setSwipeTrigger('left');
        }
      }
      setTimeout(() => setSwipeTrigger(null), 350);
    },
    [pdfDoc],
  );

  const handleNext = useCallback(() => handleSwipe('right'), [handleSwipe]);
  const handlePrev = useCallback(() => handleSwipe('left'), [handleSwipe]);
  const handleFirst = useCallback(() => pdfDoc.goFirst(), [pdfDoc]);
  const handleLast = useCallback(() => pdfDoc.goLast(), [pdfDoc]);
  const handleExit = useCallback(() => {
    setMode('idle');
    pdfDoc.close();
  }, [pdfDoc]);

  useKeyboardNav(
    { onNext: handleNext, onPrev: handlePrev, onFirst: handleFirst, onLast: handleLast, onExit: handleExit },
    mode === 'present',
  );

  const handleGestureStatus = useCallback((status: LoopStatus, error: LoopError | null) => {
    setGestureStatus(status);
    if (error) {
      const msgs: Record<LoopError, string> = {
        permission_denied: '카메라 권한이 거부되었습니다',
        not_found: '웹캠을 찾을 수 없습니다',
        in_use: '카메라가 다른 앱에서 사용 중입니다',
        unknown: '카메라 오류가 발생했습니다',
        mediapipe_load_failed: '제스처 모델을 불러올 수 없습니다. 새로고침해주세요.',
      };
      setPdfError(msgs[error] ?? '알 수 없는 오류');
    }
  }, []);

  const handleSample = useCallback((s: Sample) => {
    debugSampleSetterRef.current?.(s);
  }, []);

  const handleOnSampleRef = useCallback((setter: (s: Sample) => void) => {
    debugSampleSetterRef.current = setter;
  }, []);

  const canStart = cameraGranted && pdfDoc.state.pdf !== null;

  // ── 시작 화면 ──
  if (mode === 'idle') {
    return (
      <div className="idle-screen">
        {unsupported && (
          <div className="browser-warn">
            ⚠️ Chrome 또는 Edge에서 사용해주세요
          </div>
        )}
        <h1 className="app-title">모션 인식 PPT 컨트롤러</h1>
        <p className="app-subtitle">손동작으로 슬라이드를 넘기세요</p>
        <div className="idle-card">
          <PdfDropzone
            onFile={pdfDoc.open}
            fileName={pdfDoc.state.pdf?.name}
            pageCount={pdfDoc.state.pageCount}
            error={pdfDoc.state.error}
          />
          <div className="idle-section">
            <CameraPermission
              onGranted={() => setCameraGranted(true)}
              onError={() => setCameraGranted(false)}
            />
          </div>
          {pdfError && <div className="idle-error">{pdfError}</div>}
          <button
            className="start-btn"
            disabled={!canStart}
            onClick={() => { setPdfError(null); setMode('present'); }}
          >
            발표 시작
          </button>
          <div className="idle-hint">키보드: ← → Space / PageDown / ESC</div>
        </div>
        <style>{`
          .idle-screen { min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:24px; gap:16px; }
          .browser-warn { background:rgba(255,90,95,0.15); border:1px solid var(--error); border-radius:8px; padding:10px 16px; font-size:0.85rem; color:var(--error); max-width:480px; text-align:center; }
          .app-title { font-size:1.8rem; font-weight:700; margin:0; text-align:center; }
          .app-subtitle { color:var(--muted); font-size:1rem; margin:0; }
          .idle-card { width:100%; max-width:480px; display:flex; flex-direction:column; gap:20px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:16px; padding:28px; }
          .idle-section { display:flex; flex-direction:column; gap:8px; }
          .idle-error { color:var(--error); font-size:0.85rem; text-align:center; }
          .start-btn { padding:14px; background:var(--accent); color:#000; border:none; border-radius:10px; font-size:1.05rem; font-weight:700; cursor:pointer; transition:opacity 0.2s,transform 0.1s; }
          .start-btn:disabled { opacity:0.35; cursor:not-allowed; }
          .start-btn:not(:disabled):hover { opacity:0.88; }
          .start-btn:not(:disabled):active { transform:scale(0.98); }
          .idle-hint { color:var(--muted); font-size:0.78rem; text-align:center; }
        `}</style>
      </div>
    );
  }

  // ── 발표 모드 ──
  return (
    <div className="present-screen">
      <div className="pdf-container" ref={containerRef as RefObject<HTMLDivElement>}>
        {pdfDoc.state.pdf ? (
          <PdfViewer
            blobUrl={pdfDoc.state.pdf.blobUrl}
            currentPage={pdfDoc.state.currentPage}
            onPageCount={pdfDoc.setPageCount}
            onError={(msg) => setPdfError(msg)}
            containerWidth={containerWidth}
          />
        ) : null}
      </div>

      <GestureController
        videoRef={videoRef as RefObject<HTMLVideoElement>}
        onSwipe={handleSwipe}
        onSample={handleSample}
        onStatusChange={handleGestureStatus}
        enabled={gestureEnabled}
      />

      {/* 카메라 ON일 때만 프리뷰 표시 */}
      {cameraOn && <CameraPreview videoRef={videoRef as RefObject<HTMLVideoElement>} />}

      <SwipeFeedback trigger={swipeTrigger} />

      {pdfDoc.state.pageCount > 0 && (
        <PageIndicator current={pdfDoc.state.currentPage} total={pdfDoc.state.pageCount} />
      )}

      <DebugOverlay isDebug={isDebug} onSampleRef={handleOnSampleRef} />

      {/* 카메라 토글 버튼 */}
      <button
        className={`camera-toggle-btn${cameraOn ? '' : ' off'}`}
        onClick={() => setCameraOn((v) => !v)}
        title={cameraOn ? '카메라 끄기' : '카메라 켜기'}
      >
        {cameraOn ? '📷' : '📷✕'}
      </button>

      {/* 종료 버튼 */}
      <button
        className="exit-btn"
        onClick={() => { setMode('idle'); pdfDoc.close(); }}
        title="시작 화면으로 (ESC)"
      >
        ✕
      </button>

      {gestureStatus === 'starting' && (
        <div className="gesture-loading">제스처 모델 로딩 중...</div>
      )}
      {pdfError && (
        <div className="present-error">
          {pdfError}
          <button onClick={() => setPdfError(null)}>닫기</button>
        </div>
      )}

      <style>{`
        .present-screen { position:fixed; inset:0; background:var(--bg); display:flex; align-items:center; justify-content:center; overflow:hidden; }
        .pdf-container { width:100vw; height:100vh; display:flex; align-items:center; justify-content:center; overflow:hidden; }
        .camera-toggle-btn {
          position:fixed; bottom:60px; right:16px;
          width:44px; height:44px; border-radius:50%;
          background:rgba(0,0,0,0.6); border:1px solid rgba(255,255,255,0.3);
          color:var(--fg); font-size:16px; cursor:pointer; z-index:200;
          display:flex; align-items:center; justify-content:center;
          transition:background 0.2s;
        }
        .camera-toggle-btn:hover { background:rgba(0,217,192,0.3); }
        .camera-toggle-btn.off { background:rgba(255,90,95,0.4); border-color:var(--error); }
        .exit-btn { position:fixed; bottom:16px; right:16px; width:36px; height:36px; border-radius:50%; background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.2); color:var(--fg); font-size:14px; cursor:pointer; z-index:200; display:flex; align-items:center; justify-content:center; transition:background 0.2s; }
        .exit-btn:hover { background:rgba(255,90,95,0.4); }
        .gesture-loading { position:fixed; bottom:110px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.7); color:var(--muted); font-size:0.8rem; padding:6px 14px; border-radius:20px; z-index:200; }
        .present-error { position:fixed; bottom:110px; left:50%; transform:translateX(-50%); background:rgba(255,90,95,0.15); border:1px solid var(--error); color:var(--error); font-size:0.85rem; padding:8px 16px; border-radius:8px; z-index:200; display:flex; gap:12px; align-items:center; }
        .present-error button { background:none; border:none; color:var(--error); cursor:pointer; text-decoration:underline; font-size:0.8rem; }
      `}</style>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div style={{ color: 'var(--muted)', padding: '40px', textAlign: 'center' }}>로딩 중...</div>}>
      <PresentationApp />
    </Suspense>
  );
}
