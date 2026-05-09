'use client';
// 단일 페이지 SPA — 'idle'(시작 화면) / 'present'(발표 모드) 상태로 전환
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
import { MicPermission } from '@/components/MicPermission';
import { PdfViewer } from '@/components/PdfViewer';
import { CameraPreview } from '@/components/CameraPreview';
import { GestureController } from '@/components/GestureController';
import { SwipeFeedback } from '@/components/SwipeFeedback';
import { PageIndicator } from '@/components/PageIndicator';
import { DebugOverlay } from '@/components/DebugOverlay';
import { MenuOverlay } from '@/components/MenuOverlay';
import { VirtualCursor } from '@/components/VirtualCursor';
import { SlideTitlesInput } from '@/components/SlideTitlesInput';
import { SpeechIndicator } from '@/components/SpeechIndicator';
import { RecordButton } from '@/components/RecordButton';
import { usePdfDocument } from '@/lib/application/usePdfDocument';
import { useKeyboardNav } from '@/lib/application/useKeyboardNav';
import { usePhase2Loop } from '@/lib/application/usePhase2Loop';
import { useSpeechRecognition } from '@/lib/application/useSpeechRecognition';
import { useScreenRecorder } from '@/lib/application/useScreenRecorder';
import type { SwipeDirection } from '@/lib/domain/types';
import type { Sample } from '@/lib/domain/types';
import type { LoopStatus, LoopError } from '@/lib/application/useGestureLoop';

type AppMode = 'idle' | 'present';

// 브라우저 호환성 체크
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
  const [cameraOn, setCameraOn] = useState(true);
  const [slideTitles, setSlideTitles] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [micGranted, setMicGranted] = useState(false);
  const [currentGesture, setCurrentGesture] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debugSampleSetterRef = useRef<((s: Sample) => void) | null>(null);
  const phase2SampleRef = useRef<((s: Sample) => void) | null>(null);

  const pdfDoc = usePdfDocument();

  const [screenSize, setScreenSize] = useState({ w: 1280, h: 720 });
  useEffect(() => {
    const update = () => setScreenSize({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // 컨테이너 너비 측정 (PDF 렌더 크기)
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

  // 브라우저 호환성 체크
  useEffect(() => {
    setUnsupported(!isSupportedBrowser());
  }, []);

  // 탭 비활성 시 카메라 일시정지 (E-10)
  const [tabVisible, setTabVisible] = useState(true);
  useEffect(() => {
    const handleVisibility = () => setTabVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const gestureEnabled = mode === 'present' && tabVisible && cameraOn;

  const handleSwipe = useCallback(
    (dir: SwipeDirection) => {
      if (menuOpen) return;
      const { currentPage, pageCount } = pdfDoc.state;
      if (dir === 'right') {
        if (currentPage >= pageCount) setSwipeTrigger('boundary');
        else { pdfDoc.goNext(); setSwipeTrigger('right'); }
      } else {
        if (currentPage <= 1) setSwipeTrigger('boundary');
        else { pdfDoc.goPrev(); setSwipeTrigger('left'); }
      }
      setTimeout(() => setSwipeTrigger(null), 350);
    },
    [pdfDoc, menuOpen],
  );

  const handleNext = useCallback(() => handleSwipe('right'), [handleSwipe]);
  const handlePrev = useCallback(() => handleSwipe('left'), [handleSwipe]);
  const handleFirst = useCallback(() => pdfDoc.goFirst(), [pdfDoc]);
  const handleLast = useCallback(() => pdfDoc.goLast(), [pdfDoc]);
  const handleExit = useCallback(() => { setMode('idle'); pdfDoc.close(); }, [pdfDoc]);

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
        mediapipe_load_failed: '제스처 모델을 불러올 수 없습니다.',
      };
      setPdfError(msgs[error] ?? '알 수 없는 오류');
    }
  }, []);

  const handleOnSampleRef = useCallback((setter: (s: Sample) => void) => {
    debugSampleSetterRef.current = setter;
  }, []);

  const handleMenuOpen = useCallback(() => setMenuOpen(true), []);
  const handleMenuClose = useCallback(() => setMenuOpen(false), []);
  const handleJump = useCallback((index: number) => {
    pdfDoc.goTo(index + 1);
    setMenuOpen(false);
  }, [pdfDoc]);

  const { phase2State, pushSample } = usePhase2Loop({
    onMenuOpen: handleMenuOpen,
    onMenuClose: handleMenuClose,
    onJump: handleJump,
    slideCount: pdfDoc.state.pageCount,
    screenW: screenSize.w,
    screenH: screenSize.h,
    enabled: gestureEnabled,
  });

  const handleSample = useCallback((s: Sample) => {
    debugSampleSetterRef.current?.(s);
    pushSample(s);
    setCurrentGesture(s.gesture);
  }, [pushSample]);

  const handleVoiceCommand = useCallback((cmd: import('@/lib/application/useSpeechRecognition').VoiceCommand) => {
    switch (cmd) {
      case 'next': handleSwipe('right'); break;
      case 'prev': handleSwipe('left'); break;
      case 'first': pdfDoc.goFirst(); break;
      case 'last': pdfDoc.goLast(); break;
      case 'menu': setMenuOpen((v) => !v); break;
    }
  }, [handleSwipe, pdfDoc]);

  const { status: speechStatus, lastHeard } = useSpeechRecognition({
    onCommand: handleVoiceCommand,
    enabled: speechEnabled && mode === 'present',
  });

  const { status: recordStatus, toggle: toggleRecord } = useScreenRecorder();

  const displayTitles = Array.from(
    { length: pdfDoc.state.pageCount },
    (_, i) => slideTitles[i] || `슬라이드 ${i + 1}`,
  );

  const canStart = cameraGranted && pdfDoc.state.pdf !== null;

  // ───────────────────────────────
  // 시작 화면 (Idle)
  // ───────────────────────────────
  if (mode === 'idle') {
    return (
      <div className="idle-screen">
        {/* 타이틀 */}
        <div className="app-header">
          <h1 className="app-title">모션 및 음성 인식 PPT 컨트롤러</h1>
          <p className="app-subtitle">손동작과 목소리로 슬라이드를 넘기세요</p>
        </div>

        {unsupported && (
          <div className="browser-warn">
            ⚠️ Chrome 또는 Edge에서 사용해주세요
          </div>
        )}

        <div className="idle-card">
          <PdfDropzone
            onFile={pdfDoc.open}
            fileName={pdfDoc.state.pdf?.name}
            pageCount={pdfDoc.state.pageCount}
            error={pdfDoc.state.error}
          />

          {pdfDoc.state.pageCount > 0 && (
            <SlideTitlesInput
              pageCount={pdfDoc.state.pageCount}
              titles={slideTitles}
              onChange={setSlideTitles}
            />
          )}

          <div className="idle-section">
            <CameraPermission
              onGranted={() => setCameraGranted(true)}
              onError={() => setCameraGranted(false)}
            />
          </div>

          <div className="idle-section">
            <MicPermission
              onGranted={() => { setMicGranted(true); setSpeechEnabled(true); }}
              onError={() => {}}
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

          {/* 사용 설명서 */}
          <div className="guide">
            <div className="guide-section">
              <div className="guide-title">🖐 모션 인식</div>
              <ul className="guide-list">
                <li><span className="guide-key">검지 / 손바닥 → 오른쪽</span> 다음 페이지</li>
                <li><span className="guide-key">검지 / 손바닥 → 왼쪽</span> 이전 페이지</li>
                <li><span className="guide-key">✊ 주먹 1.5초</span> 목차 열기 / 닫기</li>
                <li><span className="guide-key">☝ 검지 정지</span> 가상 커서 생성</li>
              </ul>
            </div>
            <div className="guide-section">
              <div className="guide-title">🎤 음성 인식</div>
              <ul className="guide-list">
                <li><span className="guide-key">"다음"</span> 다음 페이지</li>
                <li><span className="guide-key">"뒤로"</span> 이전 페이지</li>
                <li><span className="guide-key">"목차"</span> 목차 열기 / 닫기</li>
                <li><span className="guide-key">"처음"</span> 첫 페이지</li>
                <li><span className="guide-key">"끝"</span> 마지막 페이지</li>
              </ul>
            </div>
          </div>
        </div>



        <style>{`
          .idle-screen {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 24px;
            gap: 0;
            background: #fff;
            position: relative;
          }
          .pwc-top-bar {
            width: 100%;
            height: 4px;
            background: linear-gradient(to right, #FFF5ED, #FFCDA8 40%, #FD5108);
            flex-shrink: 0;
          }
          .pwc-logo-wrap {
            align-self: flex-start;
            padding: 20px 0 0 0;
            margin-bottom: 24px;
          }
          .app-header {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
            margin-bottom: 20px;
            text-align: center;
          }
          .app-title {
            font-family: Georgia, Noto Serif KR, serif;
            font-size: 1.9rem;
            font-weight: 700;
            line-height: 1.0;
            margin: 0;
            color: #000;
          }
          .app-subtitle {
            font-family: Arial, Noto Sans KR, sans-serif;
            color: #A1A8B3;
            font-size: 0.95rem;
            margin: 0;
            font-weight: 400;
          }
          .browser-warn {
            background: #FEF2F2;
            border: 1px solid #DC2626;
            border-radius: 6px;
            padding: 10px 16px;
            font-size: 0.82rem;
            color: #DC2626;
            max-width: 480px;
            text-align: center;
            margin-bottom: 12px;
          }
          .idle-card {
            width: 100%;
            max-width: 480px;
            display: flex;
            flex-direction: column;
            gap: 16px;
            background: #fff;
            border: 1px solid #DFE3E6;
            border-radius: 8px;
            padding: 24px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          }
          .idle-section { display: flex; flex-direction: column; gap: 6px; }
          .idle-error { color: #DC2626; font-size: 0.82rem; text-align: center; }
          .start-btn {
            padding: 13px;
            background: #FD5108;
            color: #fff;
            border: none;
            border-radius: 6px;
            font-size: 1rem;
            font-weight: 700;
            cursor: pointer;
            font-family: Arial, Noto Sans KR, sans-serif;
            transition: background 0.15s;
            letter-spacing: 0;
          }
          .start-btn:disabled { background: #CBD1D6; cursor: not-allowed; }
          .start-btn:not(:disabled):hover { background: #E54A07; }
          .start-btn:not(:disabled):active { background: #CC4006; }
          .guide {
            display: flex;
            flex-direction: column;
            gap: 10px;
            border-top: 1px solid #EEEFF1;
            padding-top: 14px;
          }
          .guide-section { display: flex; flex-direction: column; gap: 5px; }
          .guide-title {
            font-size: 0.82rem;
            font-weight: 700;
            color: #000;
            font-family: Arial, Noto Sans KR, sans-serif;
          }
          .guide-list {
            margin: 0; padding-left: 0; list-style: none;
            display: flex; flex-direction: column; gap: 3px;
          }
          .guide-list li {
            font-size: 0.8rem;
            color: #A1A8B3;
            display: flex;
            align-items: center;
            gap: 8px;
            font-family: Arial, Noto Sans KR, sans-serif;
          }
          .guide-key {
            background: #FFF5ED;
            color: #FD5108;
            border: 1px solid #FFE8D4;
            border-radius: 4px;
            padding: 1px 7px;
            font-size: 0.78rem;
            font-weight: 700;
            white-space: nowrap;
          }
          .pwc-footer {
            margin-top: 24px;
            font-size: 0.72rem;
            color: #A1A8B3;
            font-family: Arial, sans-serif;
          }
        `}</style>
      </div>
    );
  }

  // ───────────────────────────────
  // 발표 모드 (Present)
  // ───────────────────────────────
  return (
    <div className="present-screen">
      {/* PDF 뷰어 영역 */}
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

      {/* 제스처 인식 (논비주얼) */}
      <GestureController
        videoRef={videoRef as RefObject<HTMLVideoElement>}
        onSwipe={handleSwipe}
        onSample={handleSample}
        onStatusChange={handleGestureStatus}
        enabled={gestureEnabled}
      />

      {cameraOn && <CameraPreview videoRef={videoRef as RefObject<HTMLVideoElement>} />}
      <SwipeFeedback trigger={swipeTrigger} />

      {/* 목차 오버레이 */}
      {menuOpen && (
        <MenuOverlay
          titles={displayTitles}
          currentPage={pdfDoc.state.currentPage}
          hoveredIndex={phase2State.mode === 'menu' ? phase2State.dwellIndex : null}
          dwellProgress={phase2State.mode === 'menu' ? phase2State.dwellProgress : 0}
          scrollDelta={phase2State.mode === 'menu' ? phase2State.scrollDelta : 0}
          onSelect={(i) => handleJump(i)}
        />
      )}

      {/* 가상 커서 */}
      <VirtualCursor
        x={phase2State.mode === 'menu' ? phase2State.cursorX : 0}
        y={phase2State.mode === 'menu' ? phase2State.cursorY : 0}
        dwellProgress={phase2State.mode === 'menu' ? phase2State.dwellProgress : 0}
        visible={phase2State.mode === 'menu'}
      />

      {pdfDoc.state.pageCount > 0 && (
        <PageIndicator
          current={pdfDoc.state.currentPage}
          total={pdfDoc.state.pageCount}
          gesture={currentGesture}
        />
      )}

      <DebugOverlay isDebug={isDebug} onSampleRef={handleOnSampleRef} />

      {/* 녹화 버튼 */}
      <RecordButton status={recordStatus} onToggle={toggleRecord} />

      {/* 음성 인식 */}
      <SpeechIndicator
        status={speechStatus}
        lastHeard={lastHeard}
        enabled={speechEnabled}
        onToggle={() => setSpeechEnabled((v) => !v)}
      />

      {/* 카메라 토글 */}
      <button
        className={`camera-toggle-btn${cameraOn ? '' : ' off'}`}
        onClick={() => setCameraOn((v) => !v)}
        title={cameraOn ? '카메라 끄기' : '카메라 켜기'}
      >
        {cameraOn ? '📷' : '📷✕'}
      </button>

      {/* 종료 */}
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
        .present-screen {
          position: fixed;
          inset: 0;
          background: #F5F7F8;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .pdf-container {
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        /* 발표 모드 우하단 버튼 공통 스타일 */
        .camera-toggle-btn,
        .exit-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(50,50,50,0.85);
          border: 1.5px solid rgba(255,255,255,0.25);
          color: #fff;
          font-size: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s, border-color 0.2s;
          z-index: 200;
          position: fixed;
          right: 16px;
        }
        .camera-toggle-btn { bottom: 60px; }
        .camera-toggle-btn:hover { background: rgba(253,81,8,0.35); border-color: #FD5108; }
        .camera-toggle-btn.off { background: rgba(220,38,38,0.4); border-color: #DC2626; }
        .exit-btn { bottom: 16px; font-size: 14px; }
        .exit-btn:hover { background: rgba(253,81,8,0.35); border-color: #FD5108; }
        .gesture-loading {
          position: fixed;
          bottom: 110px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0,0,0,0.75);
          color: #A1A8B3;
          font-size: 0.78rem;
          padding: 6px 16px;
          border-radius: 20px;
          z-index: 200;
          font-family: Arial, sans-serif;
          border: 1px solid rgba(253,81,8,0.2);
        }
        .present-error {
          position: fixed;
          bottom: 110px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(220,38,38,0.12);
          border: 1px solid #DC2626;
          color: #DC2626;
          font-size: 0.82rem;
          padding: 8px 16px;
          border-radius: 6px;
          z-index: 200;
          display: flex;
          gap: 12px;
          align-items: center;
          font-family: Arial, sans-serif;
        }
        .present-error button {
          background: none;
          border: none;
          color: #DC2626;
          cursor: pointer;
          text-decoration: underline;
          font-size: 0.78rem;
        }
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
