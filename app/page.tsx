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
import { MenuOverlay } from '@/components/MenuOverlay';
import { VirtualCursor } from '@/components/VirtualCursor';
import { SlideTitlesInput } from '@/components/SlideTitlesInput';
import { SpeechIndicator } from '@/components/SpeechIndicator';
import { MicPermission } from '@/components/MicPermission';
import { usePdfDocument } from '@/lib/application/usePdfDocument';
import { useKeyboardNav } from '@/lib/application/useKeyboardNav';
import { usePhase2Loop } from '@/lib/application/usePhase2Loop';
import { useSpeechRecognition } from '@/lib/application/useSpeechRecognition';
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
  const [unsupported, setUnsupported] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [slideTitles, setSlideTitles] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [micGranted, setMicGranted] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debugSampleSetterRef = useRef<((s: Sample) => void) | null>(null);

  const pdfDoc = usePdfDocument();

  const [screenSize, setScreenSize] = useState({ w: 1280, h: 720 });
  useEffect(() => {
    const update = () => setScreenSize({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

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
      // 메뉴 열려있으면 스와이프 무시
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

  const handleVoiceCommand = useCallback((cmd: import('@/lib/application/useSpeechRecognition').VoiceCommand) => {
    switch (cmd) {
      case 'next': handleSwipe('right'); break;
      case 'prev': handleSwipe('left'); break;
      case 'first': pdfDoc.goFirst(); break;
      case 'last': pdfDoc.goLast(); break;
      case 'menu':
        setMenuOpen((v) => !v);
        break;
    }
  }, [handleSwipe, pdfDoc]);

  const { status: speechStatus, lastHeard } = useSpeechRecognition({
    onCommand: handleVoiceCommand,
    enabled: speechEnabled && mode === 'present',
  });

  // pushSample이 선언된 후에 handleSample 정의
  const handleSample = useCallback((s: Sample) => {
    debugSampleSetterRef.current?.(s);
    pushSample(s);
  }, [pushSample]);

  // 목차 제목 기본값 채우기
  const displayTitles = Array.from(
    { length: pdfDoc.state.pageCount },
    (_, i) => slideTitles[i] || `슬라이드 ${i + 1}`,
  );

  const canStart = cameraGranted && pdfDoc.state.pdf !== null;

  // ── 시작 화면 ──
  if (mode === 'idle') {
    return (
      <div className="idle-screen">
        {unsupported && (
          <div className="browser-warn">⚠️ Chrome 또는 Edge에서 사용해주세요</div>
        )}
        <h1 className="app-title">모션 및 음성 인식 PPT 컨트롤러</h1>
        <p className="app-subtitle">손동작과 목소리로 슬라이드를 넘기세요</p>
        <div className="idle-card">
          <PdfDropzone
            onFile={pdfDoc.open}
            fileName={pdfDoc.state.pdf?.name}
            pageCount={pdfDoc.state.pageCount}
            error={pdfDoc.state.error}
          />

          {/* 슬라이드 제목 입력 — PDF 업로드 후 표시 */}
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
            <div className="guide-keyboard">⌨ 키보드: ← → Space / Home / End / ESC</div>
          </div>
        </div>
        <style>{`
          .idle-screen { min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:24px; gap:16px; background:#ffffff; }
          .browser-warn { background:rgba(224,59,36,0.08); border:1px solid var(--error); border-radius:8px; padding:10px 16px; font-size:0.85rem; color:var(--error); max-width:480px; text-align:center; }
          .app-title { font-size:1.8rem; font-weight:700; margin:0; text-align:center; background: linear-gradient(90deg, #e03b24, #d04a02); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
          .app-subtitle { color:var(--muted); font-size:1rem; margin:0; }
          .idle-card { width:100%; max-width:480px; display:flex; flex-direction:column; gap:20px; background:#fff; border:1px solid rgba(224,59,36,0.2); border-radius:16px; padding:28px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
          .idle-section { display:flex; flex-direction:column; gap:8px; }
          .idle-error { color:var(--error); font-size:0.85rem; text-align:center; }
          .start-btn { padding:14px; background: linear-gradient(90deg, #e03b24, #d04a02); color:#fff; border:none; border-radius:10px; font-size:1.05rem; font-weight:700; cursor:pointer; transition:opacity 0.2s,transform 0.1s; }
          .start-btn:disabled { opacity:0.35; cursor:not-allowed; }
          .start-btn:not(:disabled):hover { opacity:0.88; }
          .start-btn:not(:disabled):active { transform:scale(0.98); }
          .idle-hint { color:var(--muted); font-size:0.78rem; text-align:center; line-height:1.8; }
          .guide { display:flex; flex-direction:column; gap:12px; border-top:1px solid rgba(0,0,0,0.08); padding-top:16px; }
          .guide-section { display:flex; flex-direction:column; gap:6px; }
          .guide-title { font-size:0.88rem; font-weight:700; color:var(--fg); }
          .guide-list { margin:0; padding-left:0; list-style:none; display:flex; flex-direction:column; gap:4px; }
          .guide-list li { font-size:0.82rem; color:var(--muted); display:flex; align-items:center; gap:8px; }
          .guide-key { background:rgba(224,59,36,0.1); color:var(--accent); border-radius:4px; padding:2px 7px; font-size:0.8rem; font-weight:600; white-space:nowrap; }
          .guide-keyboard { display:none; }
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
            containerWidth={screenSize.w}
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

      {cameraOn && <CameraPreview videoRef={videoRef as RefObject<HTMLVideoElement>} />}
      <SwipeFeedback trigger={swipeTrigger} />

      {pdfDoc.state.pageCount > 0 && (
        <PageIndicator current={pdfDoc.state.currentPage} total={pdfDoc.state.pageCount} />
      )}

      <DebugOverlay isDebug={isDebug} onSampleRef={handleOnSampleRef} />

      {/* 음성 인식 인디케이터 */}
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
        .present-screen { position:fixed; inset:0; background:var(--bg); display:flex; align-items:center; justify-content:center; overflow:hidden; }
        .pdf-container { width:100vw; height:100vh; display:flex; align-items:center; justify-content:center; overflow:hidden; }
        .camera-toggle-btn { position:fixed; bottom:60px; right:16px; width:44px; height:44px; border-radius:50%; background:rgba(0,0,0,0.6); border:1px solid rgba(255,255,255,0.3); color:var(--fg); font-size:16px; cursor:pointer; z-index:200; display:flex; align-items:center; justify-content:center; transition:background 0.2s; }
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
