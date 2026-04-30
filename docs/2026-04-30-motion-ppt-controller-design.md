# 모션 인식 기반 PPT 컨트롤러 — 설계 & 개발 정의서

**문서 ID**: SPEC-2026-04-30-motion-ppt-controller
**작성일**: 2026-04-30
**대상 독자**: 개발자
**범위**: Phase 1 (Lean — 스와이프 슬라이드 컨트롤). Phase 2(목차 오버레이)는 부록 참조.
**전제**: 이 문서는 처음부터 끝까지 직접 설계 및 구현한 내용을 담고 있음.

---

## 0. 이 문서를 읽는 법

**개발자(사람)**:

- 1 → 2 → 3 → 9(CLAUDE.md) 순으로 읽고 Sprint 0부터 차례로 진행.
- 각 Sprint 끝의 "검증 명령"을 반드시 실행 — 통과하지 않으면 다음 Sprint로 넘어가지 않음.

**개발자**:

- 작업 시작 전 §9의 CLAUDE.md를 프로젝트 루트에 복제하고 그 규칙을 따른다.
- §6의 레이어 의존성 규칙을 위반하지 않는다.
- §7의 Sprint 정의를 1개씩 완료한다. 한 Sprint가 끝나기 전에 다음 Sprint를 건드리지 않는다.
- 파일 800줄 한계가 가까워지면 즉시 분해(decompose)를 제안한다.
- 모든 변경은 `npm run check`를 통과해야 한다 (§9.4 정의).

---

## 1. 프로젝트 개요

### 1.1 한 줄 정의

발표자가 노트북 웹캠 앞에서 **손바닥을 펴고 좌우로 휙** 움직이는 동작만으로 PDF 슬라이드를 넘기는 단일 페이지 웹앱.

### 1.2 핵심 사용 시나리오

발표자가 노트북 화면을 빔프로젝터에 연결한다. 브라우저에서 본 앱을 열고, PDF 발표 자료를 업로드한다. 카메라 권한을 허용하면 발표 모드에 진입한다. 노트북 정면에 서서 손바닥을 카메라에 보이며 오른쪽으로 빠르게 움직이면 다음 슬라이드, 왼쪽으로 움직이면 이전 슬라이드로 이동한다. 화면 우상단에 작은 카메라 프리뷰가 떠 있어 자신의 손이 인식 영역에 있는지 실시간으로 확인할 수 있다. ESC 키를 누르면 시작 화면으로 돌아온다.

### 1.3 비범위 (Out of Scope)

다음은 본 PoC에서 **명시적으로 만들지 않는다**. 다음 항목은 구현하지 않는다.

- 백엔드 서버 (Python, Node 서버, DB 일체 없음)
- 사용자 인증/계정/권한
- PPTX(.pptx) 직접 렌더링 (PDF만 지원)
- 모바일/태블릿 지원 (Windows 노트북 + Chrome/Edge 한정)
- 음성 명령
- 박수 인식 (제거됨 — Phase 2에서도 도입하지 않음)
- 가상 커서 / Dwell time 클릭 (Phase 2)
- 다국어 지원 (UI 한국어 단일)
- 다중 사용자/세션
- 슬라이드 주석/필기/하이라이트
- 네트워크 동기화/원격 제어
- 발표 자료 저장 (브라우저 메모리에만 존재. 새로고침 시 사라짐)

### 1.4 성공의 정의

다음 5개를 만족하면 Phase 1 완료:

1. 정상 조명 환경에서 좌/우 스와이프 인식률 ≥ 90% (10회 중 9회)
2. 1분간 자연 발화/손짓 중 오작동 ≤ 1회
3. 인식 → 페이지 전환 지연 ≤ 200ms (체감 즉시)
4. PDF 업로드 → 발표 모드 진입까지 무중단
5. §8.2 수동 체크리스트 전 항목 통과

---

## 2. 요구사항

### 2.1 기능 요구사항 (FR)

| ID    | 요구사항                                                                           | 우선순위 |
| ----- | ---------------------------------------------------------------------------------- | -------- |
| FR-01 | 사용자는 로컬 PDF 파일을 업로드할 수 있다                                          | Must     |
| FR-02 | 사용자는 카메라 사용 권한을 허용/거부할 수 있다                                    | Must     |
| FR-03 | 시스템은 업로드된 PDF의 페이지를 화면에 풀스크린으로 표시한다                      | Must     |
| FR-04 | 시스템은 카메라 영상을 우상단에 미러링하여 프리뷰로 표시한다                       | Must     |
| FR-05 | `Open_Palm` 제스처로 카메라 시점 기준 우→좌 이동 시 다음 페이지로 이동한다         | Must     |
| FR-06 | `Open_Palm` 제스처로 카메라 시점 기준 좌→우 이동 시 이전 페이지로 이동한다         | Must     |
| FR-07 | 페이지 전환 시 0.3초간 시각 피드백(가장자리 글로우)을 표시한다                     | Must     |
| FR-08 | 페이지 한계(첫/마지막)에서 추가 스와이프는 무시되며 흔들림 애니메이션으로 표시한다 | Must     |
| FR-09 | ESC 키 또는 종료 버튼으로 시작 화면으로 복귀할 수 있다                             | Must     |
| FR-10 | 좌하단에 현재 페이지 / 전체 페이지 수를 표시한다                                   | Should   |
| FR-11 | `?debug=1` 쿼리 파라미터 시 디버그 오버레이를 표시한다                             | Should   |
| FR-12 | 카메라/PDF/MediaPipe 실패 시 명확한 에러 메시지를 표시한다                         | Must     |

### 2.2 비기능 요구사항 (NFR)

| ID     | 항목        | 기준                                    |
| ------ | ----------- | --------------------------------------- |
| NFR-01 | 프레임률    | ≥ 30fps (제스처 처리 루프)              |
| NFR-02 | 인식 지연   | 스와이프 동작 종료 후 ≤ 200ms           |
| NFR-03 | 인식 정확도 | ≥ 90% (정상 조명, 50cm~1.5m 거리)       |
| NFR-04 | 오작동률    | 자연 발화 1분 기준 ≤ 1회                |
| NFR-05 | 초기 로딩   | 첫 페이지 로드 ≤ 5초 (브로드밴드)       |
| NFR-06 | 메모리      | 100MB PDF 업로드 시 OOM 없음            |
| NFR-07 | 호환성      | Chrome 120+, Edge 120+ on Windows 10/11 |
| NFR-08 | 빌드 시간   | `npm run build` ≤ 60초                  |
| NFR-09 | 테스트 시간 | `npm test` ≤ 10초                       |

### 2.3 제약 조건

| ID   | 제약                                                              |
| ---- | ----------------------------------------------------------------- |
| C-01 | 단일 파일 ≤ 800줄 (강제 — ESLint `max-lines` 규칙)                |
| C-02 | 백엔드 없음 — 모든 처리는 브라우저 단독                           |
| C-03 | TypeScript strict 모드 — `any` 사용 금지 (강제 — ESLint)          |
| C-04 | 레이어 의존성 단방향 — §6.4 의존성 규칙 위반 금지                 |
| C-05 | 도메인 레이어(`lib/domain/`) 100% 단위 테스트 커버리지            |
| C-06 | 모든 외부 부수효과(카메라, MediaPipe, DOM)는 인프라 레이어로 격리 |

---

## 3. 아키텍처

### 3.1 시스템 구조 (런타임)

```
┌────────────────────────────────────────────────────────────┐
│                    브라우저 (Chrome/Edge)                    │
│                                                            │
│  ┌────────────┐       ┌──────────────┐    ┌────────────┐  │
│  │  Webcam    │──────▶│  MediaPipe    │──▶│  Swipe     │  │
│  │ (getUser-  │ video │  Gesture      │   │  Detector  │  │
│  │  Media)    │ frame │  Recognizer  │   │ (pure fn)  │  │
│  └────────────┘       └──────────────┘    └─────┬──────┘  │
│                                                  │         │
│                                  swipe direction │         │
│                                                  ▼         │
│  ┌────────────────────┐                ┌──────────────┐   │
│  │  PDF File (in-mem) │───render──────▶│  PdfViewer   │   │
│  └────────────────────┘                │  (react-pdf) │   │
│                                         └──────┬───────┘   │
│                                                │           │
│                                          page change       │
│                                                ▼           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  화면 합성: PDF (풀스크린) + 카메라 프리뷰 (우상단)        │  │
│  └─────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

서버는 정적 파일 호스팅만. Vercel 배포 또는 `npm start` 로컬 실행.

### 3.2 기술 스택 + 선정 이유

| 레이어        | 선택                        | 버전                | 이유                                                                            |
| ------------- | --------------------------- | ------------------- | ------------------------------------------------------------------------------- |
| 프레임워크    | Next.js                     | 14.2.x (App Router) | 표준 React 프레임워크, 정적 빌드 지원, 풍부한 생태계             |
| 언어          | TypeScript                  | 5.4.x               | 도메인 타입 안전성 — 제스처/좌표/상태 명확화            |
| 제스처 인식   | @mediapipe/tasks-vision     | 0.10.18             | 사전학습 모델, 브라우저 단독, 30fps+, 7가지 제스처 분류 + 21 랜드마크 동시 출력 |
| PDF 렌더링    | react-pdf                   | 9.1.x               | pdf.js 의 React 친화 래퍼, 페이지 사전 마운트 가능                              |
| PDF 엔진      | pdfjs-dist                  | 4.4.x               | react-pdf 의존성. CDN worker 사용                                               |
| 카메라        | WebRTC `getUserMedia`       | 브라우저 표준       | Lenovo 웹캠 자동 인식, 별도 SDK 불필요                                          |
| 상태 관리     | React Hooks                 | (React 18)          | PoC 규모에 외부 라이브러리 불필요. `useState` + `useRef`만                      |
| 테스트        | Vitest                      | 1.6.x               | Next.js와 빠른 통합, ESM 친화                                                   |
| 린팅          | ESLint + eslint-config-next | 8.x / 14.x          | Next.js 권장 규칙 + 커스텀 규칙 (max-lines, no-any)                             |
| 포매팅        | Prettier                    | 3.x                 | 결정적 포맷 — 스타일 일관성 유지                                              |
| 패키지 매니저 | npm                         | 10.x                | 가장 표준적, Windows 호환 무난                                                  |

**채택하지 않은 것** (이유 명시):

| 항목           | 거부 이유                                             |
| -------------- | ----------------------------------------------------- |
| Zustand/Redux  | PoC 규모에 over-engineering. `useState`로 충분        |
| Tailwind CSS   | 학습 부담. CSS Modules로 충분                         |
| Electron/Tauri | 브라우저 단독으로 요구사항 만족. 패키징 복잡도 불필요 |
| Python 백엔드  | 웹 PDF 뷰어 채택으로 키보드 송신 불필요               |
| Storybook      | PoC 규모에 불필요                                     |
| Playwright E2E | 카메라/MediaPipe 모킹 비용 > 수동 검증 비용           |

### 3.3 Clean Architecture 레이어

본 프로젝트는 4개 레이어로 분리된다. **안쪽 레이어는 바깥쪽을 모른다**(Dependency Rule).

```
┌─────────────────────────────────────────────┐
│ 4. Presentation  (React 컴포넌트, Next.js)    │  ← 사용자 입력/렌더
│    components/, app/                         │
├─────────────────────────────────────────────┤
│ 3. Application   (오케스트레이션, 훅)         │  ← 레이어 연결
│    lib/application/                          │
├─────────────────────────────────────────────┤
│ 2. Infrastructure (외부 시스템 어댑터)        │  ← MediaPipe, 카메라, PDF
│    lib/infrastructure/                       │
├─────────────────────────────────────────────┤
│ 1. Domain        (순수 비즈니스 로직)          │  ← 의존성 0
│    lib/domain/                               │
└─────────────────────────────────────────────┘
```

**의존성 방향**: 4 → 3 → 2 → 1. 거꾸로 금지.

### 3.4 레이어 책임

| 레이어         | 위치                  | 책임                                                      | 의존 가능              | 금지                                               |
| -------------- | --------------------- | --------------------------------------------------------- | ---------------------- | -------------------------------------------------- |
| Domain         | `lib/domain/`         | 순수 함수: 스와이프 판정, 타입, 설정 상수                 | 없음                   | React, DOM, MediaPipe, fetch, Date.now() 직접 호출 |
| Infrastructure | `lib/infrastructure/` | 카메라 시작/종료, MediaPipe 초기화, PDF 로드, 시간 공급자 | Domain                 | UI 렌더, 비즈니스 판정                             |
| Application    | `lib/application/`    | React 훅으로 Infrastructure + Domain 결합                 | Domain, Infrastructure | UI 마크업                                          |
| Presentation   | `components/`, `app/` | UI 마크업, 이벤트 핸들러                                  | Application            | 직접 MediaPipe/카메라 호출                         |

핵심 규칙:

- **Domain은 시간을 받는다, 가져오지 않는다** — `Date.now()` 호출 금지. 호출자가 `t: number`를 인자로 넘김. 테스트에서 임의 타임스탬프 주입 가능.
- **Infrastructure는 Promise/콜백 인터페이스로 외부 호출** — 도메인은 결과 구조체만 안다.
- **Application은 React 의존 OK** — 단, 비즈니스 분기는 Domain에서.

### 3.5 Harness Engineering 원칙

본 프로젝트는 다음 자동화된 하니스로 사람의 실수를 컴파일/실행 전에 잡는다. 이 하니스가 가드레일 역할을 한다.

**P-1. 결정적 검증 명령** (`npm run check`)

- `tsc --noEmit` (타입 검증)
- `eslint . --max-warnings=0` (정적 분석)
- `prettier --check .` (포맷 검증)
- `vitest run` (단위 테스트)
- 4개 모두 0 exit code일 때만 통과. 한 명령이라도 실패 시 빌드 중단.

**P-2. 파일 크기 강제**

- ESLint `max-lines: ['error', { max: 800, skipBlankLines: true, skipComments: true }]`
- 800줄 한계 도달 시 빌드 실패 → 분해 강제

**P-3. 타입 안전 강제**

- `tsconfig.json`: `"strict": true`, `"noUncheckedIndexedAccess": true`
- ESLint `@typescript-eslint/no-explicit-any: 'error'`
- ESLint `@typescript-eslint/no-non-null-assertion: 'error'`

**P-4. 레이어 침범 정적 차단**

- ESLint `no-restricted-imports`로 도메인이 React/DOM/외부 라이브러리 임포트하면 에러 (§9.3 ESLint 설정 참조)

**P-5. 사전 커밋 게이트**

- husky + lint-staged 자동 설치
- 커밋 직전 `npm run check` 자동 실행. 실패 시 커밋 차단. `--no-verify` 사용 금지(§9 CLAUDE.md에 명시).

**P-6. 디버그 모드 분리**

- `?debug=1` 쿼리로 디버그 오버레이 활성화
- 프로덕션 빌드에서 자동 제거되지 않으므로 의도적으로 노출 가능 (PoC라 OK)

**P-7. 단일 진실의 출처 (Single Source of Truth)**

- 튜닝 상수는 `lib/domain/config.ts` 한 곳에만 존재
- 코드 어디서든 직접 숫자 리터럴 쓰면 ESLint 경고 (`no-magic-numbers` for the relevant ranges)

**P-8. 픽처(Fixture) 기반 테스트**

- 스와이프 판정 테스트는 가짜 샘플 시퀀스로 결정적 검증
- 카메라/MediaPipe 통합 부분은 단위 테스트 안 함 (수동 검증으로 대체)

이 8개 원칙은 §9 CLAUDE.md에 그대로 반영하여 일관되게 적용한다.

---

## 4. 사용자 플로우 & UI

### 4.1 화면 흐름도

```
[Idle / 시작 화면]
   │
   ├── PDF 업로드 OR 드래그
   │      │
   │      ▼
   │   [PDF 로드됨]
   │
   ├── 카메라 권한 요청
   │      │
   │      ├── 허용 ─────▶ [카메라 OK]
   │      └── 거부 ─────▶ [에러 안내 + 재시도]
   │
   └── 둘 다 OK + [발표 시작] 클릭
          │
          ▼
   [발표 모드]
       │
       ├── Open_Palm + 우 스와이프 ───▶ 다음 페이지 + 우글로우
       ├── Open_Palm + 좌 스와이프 ───▶ 이전 페이지 + 좌글로우
       ├── 첫 페이지에서 좌 스와이프 ───▶ 흔들림(noop)
       ├── 마지막에서 우 스와이프 ──────▶ 흔들림(noop)
       ├── 키보드 ←/→ ───────────▶ 페이지 변경 (백업 입력)
       └── ESC 또는 ✕ 버튼 ─────▶ [Idle]
```

### 4.2 화면 1 — 시작 화면 (`/`)

```
┌───────────────────────────────────────────────────┐
│                                                   │
│           모션 인식 PPT 컨트롤러                     │
│           — 손동작으로 슬라이드를 넘기세요 —          │
│                                                   │
│   ┌─────────────────────────────────────────────┐ │
│   │  [📄] PDF 파일을 끌어다 놓거나               │ │
│   │       [파일 선택]을 클릭하세요               │ │
│   │                                             │ │
│   │  현재: presentation.pdf (23 페이지) ✓        │ │
│   └─────────────────────────────────────────────┘ │
│                                                   │
│   카메라 상태: ●  허용됨                            │
│              (또는 [카메라 권한 요청] 버튼)          │
│                                                   │
│            [ 발표 시작 ]                            │
│                                                   │
│   ※ Chrome 또는 Edge에서 사용해주세요               │
└───────────────────────────────────────────────────┘
```

요소:

- **PDF 드롭존**: `<input type="file" accept="application/pdf">` + 드래그앤드롭. 선택 후 파일명 + 페이지 수 표시.
- **카메라 상태**: `navigator.mediaDevices.getUserMedia({ video: true })` 호출 결과.
- **발표 시작 버튼**: PDF + 카메라 둘 다 OK일 때만 활성화. 클릭 시 `/present`로 라우팅하며 PDF File 객체와 MediaStream을 React Context 또는 sessionStorage(blob URL)로 전달.

### 4.3 화면 2 — 발표 모드 (`/present`)

```
┌───────────────────────────────────────────┬─────────┐
│                                           │ ┌─────┐ │
│                                           │ │ 카메 │ │
│                                           │ │ 라프  │ │
│                                           │ │ 리뷰  │ │
│                                           │ │200×150│ │
│                                           │ └─────┘ │
│                                           │         │
│                                           │         │
│         PDF 슬라이드 (풀스크린, Fit)         │         │
│                                           │         │
│                                           │         │
│                                           │         │
│                                           │         │
│  5 / 23                              [✕]   │         │
└───────────────────────────────────────────┴─────────┘
```

요소 좌표/크기:

- **PDF 영역**: viewport 거의 전체. 우상단 카메라 프리뷰 영역만 빼고. `object-fit: contain`으로 PDF 비율 유지.
- **카메라 프리뷰**: 우상단 고정. 200×150px. `transform: scaleX(-1)` 미러링. 1px 흰색 보더 + 약간의 그림자.
- **페이지 인디케이터**: 좌하단 16px 마진. 폰트 14px, 반투명 흰배경.
- **종료 버튼**: 우상단 카메라 프리뷰 아래쪽 또는 좌상단 (UI 충돌 방지).
- **시각 피드백 글로우**: 우/좌 가장자리 16px 너비, opacity 0→1→0 (0.3s ease).
- **한계 흔들림**: 컨테이너 `transform: translateX` 키프레임 (-8px → +8px → 0, 0.3s).

### 4.4 시각 피드백 명세

| 이벤트                        | 시각 피드백                    | 시간 | 구현                           |
| ----------------------------- | ------------------------------ | ---- | ------------------------------ |
| 우 스와이프 인식              | 우측 가장자리 청록색 글로우    | 0.3s | CSS `@keyframes`, `box-shadow` |
| 좌 스와이프 인식              | 좌측 가장자리 청록색 글로우    | 0.3s | 동일                           |
| 마지막 페이지에서 우 스와이프 | 컨테이너 좌우 흔들림 (빨강 톤) | 0.3s | `@keyframes shake`             |
| 첫 페이지에서 좌 스와이프     | 동일                           | 0.3s | 동일                           |
| 페이지 전환 자체              | react-pdf 페이지 교체 (즉시)   | 즉시 | 사전 마운트로 깜빡임 방지      |

### 4.5 키보드 백업 입력 (호환성)

제스처 외에 키보드 입력도 동일 동작 — 카메라 미작동/시연 실패 대비:

| 키                     | 동작          |
| ---------------------- | ------------- |
| → / Space / PageDown   | 다음 페이지   |
| ← / Backspace / PageUp | 이전 페이지   |
| Home                   | 첫 페이지     |
| End                    | 마지막 페이지 |
| ESC                    | 시작 화면으로 |

### 4.6 엣지 케이스 처리표

| ID   | 상황                             | UI 처리                                                     | 비고                                    |
| ---- | -------------------------------- | ----------------------------------------------------------- | --------------------------------------- |
| E-01 | 카메라 권한 거부                 | 시작 화면에 안내 + "권한 다시 요청" 버튼 + 키보드 모드 안내 | 발표는 키보드만으로도 가능              |
| E-02 | 카메라 디바이스 없음             | "웹캠을 찾을 수 없습니다" 토스트 + 키보드 모드 진입 옵션    |                                         |
| E-03 | MediaPipe 모델 로드 실패         | "제스처 모델을 불러올 수 없습니다. 새로고침해주세요"        | 재시도 버튼                             |
| E-04 | PDF 파싱 실패 (손상/암호)        | "PDF를 읽을 수 없습니다. 다른 파일을 선택해주세요"          |                                         |
| E-05 | PDF 너무 큼 (>200MB)             | "파일이 너무 큽니다 (최대 200MB)"                           | 사전 차단                               |
| E-06 | 첫 페이지에서 좌 스와이프        | 흔들림. 페이지 변경 X                                       | E-08과 다른 시각화                      |
| E-07 | 마지막 페이지에서 우 스와이프    | 흔들림. 페이지 변경 X                                       |                                         |
| E-08 | 스와이프 직후 추가 스와이프      | 800ms 쿨다운 동안 무시                                      | 시각 피드백 없음                        |
| E-09 | 브라우저 비호환 (Safari/Firefox) | 시작 화면에 경고 배너 (차단은 X)                            | MediaPipe는 Firefox도 동작하지만 보장 X |
| E-10 | 페이지 비가시(탭 전환)           | `document.visibilitychange`로 카메라 일시정지               | 배터리 절약                             |

---

## 5. 제스처 인식 로직 (핵심)

### 5.1 MediaPipe 출력 구조

`@mediapipe/tasks-vision` 의 `GestureRecognizer.recognizeForVideo(video, timestamp)` 매 호출 결과:

```typescript
{
  gestures: Array<Array<{ categoryName: string; score: number }>>,
  // gestures[0]: 첫 번째 손의 제스처 후보 리스트 (top-1만 사용)
  landmarks: Array<Array<{ x: number; y: number; z: number }>>,
  // landmarks[0]: 첫 번째 손의 21개 랜드마크. x,y는 [0,1] 정규화
  worldLandmarks: ...,  // 사용 안 함
  handedness: ...       // 사용 안 함
}
```

categoryName 후보:

- `"Closed_Fist"`, `"Open_Palm"`, `"Pointing_Up"`, `"Thumbs_Up"`, `"Thumbs_Down"`, `"Victory"`, `"ILoveYou"`, `"None"`

랜드마크 인덱스 (Phase 1에서는 0번만 사용):

- 0: WRIST (손목) — 가장 안정적, 떨림 적음
- 4: THUMB_TIP, 8: INDEX_FINGER_TIP, ... (Phase 2용)

### 5.2 Phase 1 사용 데이터

| 항목                          | 변수명    | 사용처                          |
| ----------------------------- | --------- | ------------------------------- |
| `gestures[0][0].categoryName` | `gesture` | 의도성 게이트 (Open_Palm 검사)  |
| `gestures[0][0].score`        | `score`   | 신뢰도 임계 통과 검사           |
| `landmarks[0][0].x`           | `x`       | 좌우 이동 추적 (단, 정규화 0~1) |

### 5.3 스와이프 판정 알고리즘 (의사코드)

```
입력: state(buffer, cooldownUntil), sample(t, x, gesture, score), config
출력: nextState, swipeResult ('left' | 'right' | null)

1. buffer.push(sample)
2. buffer = buffer.filter(s => sample.t - s.t <= config.WINDOW_MS)
3. if sample.t < cooldownUntil:
       return { nextState, swipe: null }
4. if buffer.length < config.MIN_SAMPLES:
       return { nextState, swipe: null }
5. openPalmCount = buffer.filter(s =>
       s.gesture === 'Open_Palm' && s.score >= config.MIN_SCORE
   ).length
6. openPalmRatio = openPalmCount / buffer.length
7. if openPalmRatio < config.OPEN_PALM_RATIO:
       return { nextState, swipe: null }
8. firstX = buffer[0].x
   lastX = buffer[buffer.length - 1].x
   deltaX = lastX - firstX
9. if abs(deltaX) < config.DELTA_X_THRESHOLD:
       return { nextState, swipe: null }
10. swipe = deltaX > 0 ? 'right' : 'left'
    nextState.cooldownUntil = sample.t + config.COOLDOWN_MS
    nextState.buffer = []
    return { nextState, swipe }
```

### 5.4 튜닝 상수 (단일 진실의 출처)

`lib/domain/config.ts` 한 파일에만 정의. 다른 파일에서 숫자 리터럴 사용 금지.

| 상수                | 값   | 단위         | 의미                       | 튜닝 가이드                               |
| ------------------- | ---- | ------------ | -------------------------- | ----------------------------------------- |
| `WINDOW_MS`         | 500  | ms           | 슬라이딩 윈도우 길이       | 길수록 느린 동작 인식, 짧을수록 빠른 반응 |
| `MIN_SAMPLES`       | 5    | 개           | 윈도우 내 최소 샘플 수     | 너무 적으면 노이즈에 발사                 |
| `OPEN_PALM_RATIO`   | 0.7  | 0~1          | Open_Palm 프레임 비율 임계 | 낮추면 인식 ↑/오작동 ↑                    |
| `MIN_SCORE`         | 0.7  | 0~1          | Open_Palm 신뢰도 임계      | 낮추면 인식 ↑/오작동 ↑                    |
| `DELTA_X_THRESHOLD` | 0.25 | 0~1 (정규화) | 좌→우 또는 우→좌 이동 거리 | 화면의 25% 이동 필요                      |
| `COOLDOWN_MS`       | 800  | ms           | 연속 발사 방지             | 짧으면 더블 발사, 길면 답답               |

### 5.5 카메라 좌우 반전 처리

문제: 사람은 거울처럼 본다(우상단 = 내 우측 손). 그러나 MediaPipe는 카메라 원본을 본다(우상단 = 카메라 시점에서 좌측).

해결:

- **프리뷰**: CSS `transform: scaleX(-1)` 적용 → 사용자 직관적
- **MediaPipe 입력**: 원본 그대로 → 좌표는 카메라 시점 (사용자 우측 손 = MediaPipe x값 작음)
- **deltaX 부호 결정**: 사용자가 우측으로 손을 움직이면 카메라 시점에서 x가 감소 → `deltaX < 0` 이 "사용자 시점 우측"

→ Phase 1 매핑:

- `deltaX < -threshold` (사용자 우측 이동) → **다음** 페이지
- `deltaX > +threshold` (사용자 좌측 이동) → **이전** 페이지

⚠️ 이 부호는 **노트북 카메라가 사용자 정면**일 때 기준. 외장 카메라가 거꾸로 설치되면 반대. **Sprint 4에서 실제 노트북에서 디버그 오버레이로 1분 이내 확인 필수**. 만약 거꾸로면 `config.MIRROR_X = true` 플래그로 부호만 뒤집기 (알고리즘 내부에 부호 분기 만들지 말고 flag로 처리).

→ **권장: `config.ts`에 `INVERT_DIRECTION: false` 플래그 추가**. Sprint 4 검증 후 필요 시 true로.

### 5.6 디버그 오버레이 명세

`?debug=1` 쿼리 파라미터일 때 카메라 프리뷰 위/아래에 다음 표시 (200×150 영역 그대로 두고 그 옆/아래에 패널):

```
┌─ DEBUG ────────────────┐
│ gesture: Open_Palm      │
│ score:   0.92           │
│ wrist x: 0.412          │
│ buffer:  12 samples     │
│ deltaX:  -0.18 → wait   │
│ cooldown: 0ms           │
│ fps:     30.2           │
└────────────────────────┘
```

업데이트 주기: 100ms (10Hz). 너무 자주 업데이트하면 React 리렌더 비용 증가.

---

## 6. 코드베이스 구조

### 6.1 디렉토리 구조 (전체)

```
motion-ppt-controller/
├── .husky/
│   └── pre-commit                  # npm run check 자동 실행
├── .vscode/
│   └── settings.json               # 포맷-온-세이브
├── app/
│   ├── layout.tsx                  # 루트 레이아웃 (글로벌 CSS, 폰트)
│   ├── page.tsx                    # 단일 페이지 SPA: 시작 화면 + 발표 모드 (mode 상태로 전환)
│   ├── globals.css                 # 글로벌 스타일
│   └── error.tsx                   # 라우트 에러 바운더리
├── components/
│   ├── PdfDropzone.tsx             # PDF 업로드 UI
│   ├── CameraPermission.tsx        # 카메라 권한 UI
│   ├── PdfViewer.tsx               # react-pdf 렌더 (현재 ±1 사전 마운트)
│   ├── CameraPreview.tsx           # 우상단 미러링 프리뷰
│   ├── GestureController.tsx       # MediaPipe 루프 호스트 (Application 훅 사용)
│   ├── SwipeFeedback.tsx           # 가장자리 글로우 / 흔들림
│   ├── DebugOverlay.tsx            # ?debug=1 패널
│   └── PageIndicator.tsx           # 좌하단 N/M
├── lib/
│   ├── domain/
│   │   ├── types.ts                # GestureName, Sample, SwipeDirection, etc.
│   │   ├── config.ts               # 튜닝 상수 (단일 출처)
│   │   └── swipeDetector.ts        # 순수 함수 판정 로직
│   ├── infrastructure/
│   │   ├── camera.ts               # getUserMedia 래퍼
│   │   ├── mediapipe.ts            # GestureRecognizer 초기화/recognize
│   │   ├── pdfLoader.ts            # File → blob URL → 페이지 카운트
│   │   └── time.ts                 # performance.now() 추상화 (테스트용)
│   └── application/
│       ├── useGestureLoop.ts       # 카메라 + MediaPipe + Detector 결합 훅
│       ├── usePdfDocument.ts       # PDF 상태 훅
│       └── useKeyboardNav.ts       # 키보드 백업 입력 훅
├── public/
│   ├── sample.pdf                  # (선택) 데모용 샘플 — 본 PoC는 (a) 업로드만이라 제외 가능
│   └── favicon.ico
├── tests/
│   └── domain/
│       └── swipeDetector.test.ts   # 순수 로직 단위 테스트
├── .eslintrc.json                  # ESLint 설정 (max-lines, no-any, layer 규칙)
├── .prettierrc.json
├── .gitignore
├── CLAUDE.md                       # §9 참조
├── README.md                       # 빠른 시작
├── next.config.mjs
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

총 파일 수: ~30개. 모두 800줄 한계 안에 충분.

### 6.2 파일별 책임 + 예상 줄 수

| 파일                                 | 책임                              | 예상 줄수 |
| ------------------------------------ | --------------------------------- | --------- |
| `app/layout.tsx`                     | 루트 레이아웃, 폰트, 메타         | ~40       |
| `app/page.tsx`                       | SPA 루트: 시작 화면 + 발표 모드   | ~250      |
| `app/error.tsx`                      | 에러 바운더리                     | ~30       |
| `app/globals.css`                    | 리셋, 변수                        | ~80       |
| `components/PdfDropzone.tsx`         | PDF 입력 UI                       | ~120      |
| `components/CameraPermission.tsx`    | 권한 요청 UI                      | ~80       |
| `components/PdfViewer.tsx`           | react-pdf + 사전 마운트           | ~150      |
| `components/CameraPreview.tsx`       | 미러링 비디오 표시                | ~70       |
| `components/GestureController.tsx`   | useGestureLoop 호스트 + 콜백 처리 | ~100      |
| `components/SwipeFeedback.tsx`       | 글로우/흔들림 트리거              | ~120      |
| `components/DebugOverlay.tsx`        | 디버그 패널                       | ~100      |
| `components/PageIndicator.tsx`       | 페이지 표시                       | ~40       |
| `lib/domain/types.ts`                | 타입 정의                         | ~60       |
| `lib/domain/config.ts`               | 상수 + 환경 플래그                | ~50       |
| `lib/domain/swipeDetector.ts`        | 판정 로직                         | ~120      |
| `lib/infrastructure/camera.ts`       | getUserMedia                      | ~80       |
| `lib/infrastructure/mediapipe.ts`    | GestureRecognizer 초기화/호출     | ~120      |
| `lib/infrastructure/pdfLoader.ts`    | File 검증 + blob URL              | ~70       |
| `lib/infrastructure/time.ts`         | performance.now()                 | ~20       |
| `lib/application/useGestureLoop.ts`  | 카메라+MP+Detector 결합           | ~180      |
| `lib/application/usePdfDocument.ts`  | PDF 상태                          | ~80       |
| `lib/application/useKeyboardNav.ts`  | 키보드 핸들러                     | ~70       |
| `tests/domain/swipeDetector.test.ts` | 단위 테스트 ~12 케이스            | ~250      |

**모든 파일 800줄 미만 충족.** 가장 큰 후보: `useGestureLoop.ts` (~180줄). 여유 있음.

### 6.3 의존성 그래프 (요약)

```
app/page.tsx
  ├─ components/PdfDropzone
  └─ components/CameraPermission

app/present/page.tsx
  ├─ components/PdfViewer
  │    └─ lib/application/usePdfDocument
  │         └─ lib/infrastructure/pdfLoader
  ├─ components/CameraPreview
  ├─ components/GestureController
  │    └─ lib/application/useGestureLoop
  │         ├─ lib/infrastructure/camera
  │         ├─ lib/infrastructure/mediapipe
  │         ├─ lib/infrastructure/time
  │         └─ lib/domain/swipeDetector
  │              ├─ lib/domain/types
  │              └─ lib/domain/config
  ├─ components/SwipeFeedback
  ├─ components/PageIndicator
  ├─ components/DebugOverlay
  └─ lib/application/useKeyboardNav
```

### 6.4 의존성 규칙 (강제)

| from \\ to         | domain | infrastructure                        | application | components | app |
| ------------------ | ------ | ------------------------------------- | ----------- | ---------- | --- |
| **domain**         | OK     | ❌                                    | ❌          | ❌         | ❌  |
| **infrastructure** | OK     | OK                                    | ❌          | ❌         | ❌  |
| **application**    | OK     | OK                                    | OK          | ❌         | ❌  |
| **components**     | OK     | ❌ (직접 호출 금지, application 경유) | OK          | OK         | ❌  |
| **app**            | OK     | ❌                                    | OK          | OK         | OK  |

**ESLint `no-restricted-imports`로 강제** (§9.3 참조).

이유:

- Domain이 다른 레이어를 모르도록 하면 **테스트가 자유로움** (Vitest 단독)
- Components가 Infrastructure를 직접 부르지 않으면 **카메라 모킹 없이도 컴포넌트 변경 가능**
- App은 Infrastructure를 직접 부르지 않음 → **하이드레이션 이슈 회피** (Next.js SSR/CSR 경계)

---

## 7. 개발 Phase 작업 분해 (Task Breakdown)

각 Sprint는 약 2~6시간에 완료 가능한 단위. **이전 Sprint의 검증을 반드시 통과한 후 다음 Sprint를 시작**.

### Sprint 0 — 프로젝트 부트스트랩

**목표**: 빈 Next.js 프로젝트 + 모든 하니스(타입/린트/포맷/테스트) 동작 확인.

**예상 시간**: 2~3시간

**사전 조건**:

- Node.js 18+ 설치됨 (`node -v`로 확인)
- npm 10+
- Git 설치됨
- Windows 환경 (메인 타겟이지만 macOS/Linux도 가능)

**산출물**:

- 프로젝트 루트 디렉토리
- `package.json`, `tsconfig.json`, `next.config.mjs`, `vitest.config.ts`, `.eslintrc.json`, `.prettierrc.json`, `.gitignore`, `.husky/pre-commit`
- `app/layout.tsx`, `app/page.tsx` (Hello World 수준)
- `lib/domain/types.ts`, `lib/domain/config.ts` (빈 export)
- `tests/domain/swipeDetector.test.ts` (의도적 실패 1개 → 통과 1개)
- `CLAUDE.md`, `README.md`

**작업 단계**:

1. 프로젝트 생성:
   ```bash
   npx create-next-app@14 motion-ppt-controller \
     --typescript --eslint --app \
     --src-dir false --import-alias "@/*" \
     --tailwind false
   cd motion-ppt-controller
   ```
2. 추가 의존성 설치:
   ```bash
   npm install react-pdf@9 pdfjs-dist@4 @mediapipe/tasks-vision@0.10.18
   npm install -D vitest@1 @vitest/ui@1 @testing-library/react@16 \
     @testing-library/jest-dom@6 jsdom@25 \
     husky@9 lint-staged@15 prettier@3 \
     @typescript-eslint/eslint-plugin@8 @typescript-eslint/parser@8
   ```
3. `tsconfig.json` 수정 — `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`. (§9.2 템플릿 그대로 사용)
4. `.eslintrc.json` 작성 — §9.3 템플릿 그대로 복사.
5. `.prettierrc.json` 작성 — §9.3 템플릿.
6. `vitest.config.ts` 작성 — §9.3 템플릿.
7. `package.json scripts` 추가:
   ```json
   "scripts": {
     "dev": "next dev",
     "build": "next build",
     "start": "next start",
     "lint": "eslint . --max-warnings=0",
     "format": "prettier --write .",
     "format:check": "prettier --check .",
     "typecheck": "tsc --noEmit",
     "test": "vitest run",
     "test:watch": "vitest",
     "check": "npm run typecheck && npm run lint && npm run format:check && npm run test",
     "prepare": "husky"
   }
   ```
8. Husky 설치:
   ```bash
   npm run prepare
   echo 'npm run check' > .husky/pre-commit
   chmod +x .husky/pre-commit
   ```
9. 더미 도메인 파일 생성:
   - `lib/domain/types.ts`: `export type GestureName = 'Open_Palm' | ...; export type SwipeDirection = 'left' | 'right';` 등 §5.1 기반.
   - `lib/domain/config.ts`: §5.4 표 그대로 export.
   - `lib/domain/swipeDetector.ts`: 빈 함수 시그니처 + TODO 주석.
10. 더미 테스트:
    ```typescript
    // tests/domain/swipeDetector.test.ts
    import { describe, it, expect } from "vitest";
    describe("swipeDetector (placeholder)", () => {
      it("compiles", () => {
        expect(1 + 1).toBe(2);
      });
    });
    ```
11. CLAUDE.md, README.md 작성 — §9 템플릿 그대로 복사.
12. 첫 커밋:
    ```bash
    git add .
    git commit -m "chore: bootstrap Next.js project with full harness"
    ```

**검증**:

```bash
npm run check
# 0 exit. 모두 통과해야 함.

npm run dev
# http://localhost:3000 → "Hello" 류 페이지 표시
```

**완료 기준 (DoD)**:

- [ ] `npm run check` 모두 통과 (0 exit)
- [ ] `npm run dev` 으로 서버 가동, 브라우저 접속 가능
- [ ] `git commit -m "test"` 시 pre-commit hook이 `npm run check` 자동 실행
- [ ] `tsconfig.json` strict 모드 활성화
- [ ] ESLint에서 `any` 사용 시 에러 발생 (테스트: `const x: any = 1` 추가하면 lint 에러)
- [ ] CLAUDE.md, README.md 존재

**흔한 함정**:

- `create-next-app`이 ESLint 9를 설치할 수 있음 — 본 프로젝트는 ESLint 8을 권장 (eslint-config-next 14와 호환). 충돌 시 ESLint 8로 다운그레이드.
- Husky 9 부터 `husky install` 대신 `husky` 직접 호출. `package.json prepare` 스크립트가 `husky` 단독.
- Windows에서 `chmod +x`가 무시될 수 있음 — git config로 `core.fileMode false` 설정 또는 husky가 자동 처리.

---

### Sprint 1 — 도메인 레이어 (TDD)

**목표**: `swipeDetector` 순수 함수와 단위 테스트를 완성. 외부 시스템 0 의존.

**예상 시간**: 3~4시간

**사전 조건**: Sprint 0 완료.

**산출물**:

- `lib/domain/types.ts` 완성
- `lib/domain/config.ts` 완성
- `lib/domain/swipeDetector.ts` 완성
- `tests/domain/swipeDetector.test.ts` 완성 (12+ 케이스)

**작업 단계**:

1. **타입 정의 (`lib/domain/types.ts`)**:

   ```typescript
   export type GestureName =
     | "Closed_Fist"
     | "Open_Palm"
     | "Pointing_Up"
     | "Thumbs_Up"
     | "Thumbs_Down"
     | "Victory"
     | "ILoveYou"
     | "None";

   export type Sample = Readonly<{
     t: number; // ms timestamp (monotonic)
     x: number; // wrist x in [0, 1]
     gesture: GestureName;
     score: number; // [0, 1]
   }>;

   export type SwipeDirection = "left" | "right";

   export type DetectorState = Readonly<{
     buffer: ReadonlyArray<Sample>;
     cooldownUntil: number;
   }>;

   export type DetectResult = Readonly<{
     state: DetectorState;
     swipe: SwipeDirection | null;
   }>;

   export type SwipeConfig = Readonly<{
     WINDOW_MS: number;
     MIN_SAMPLES: number;
     OPEN_PALM_RATIO: number;
     MIN_SCORE: number;
     DELTA_X_THRESHOLD: number;
     COOLDOWN_MS: number;
     INVERT_DIRECTION: boolean;
   }>;
   ```

2. **상수 (`lib/domain/config.ts`)**:

   ```typescript
   import type { SwipeConfig } from "./types";

   export const DEFAULT_SWIPE_CONFIG: SwipeConfig = {
     WINDOW_MS: 500,
     MIN_SAMPLES: 5,
     OPEN_PALM_RATIO: 0.7,
     MIN_SCORE: 0.7,
     DELTA_X_THRESHOLD: 0.25,
     COOLDOWN_MS: 800,
     INVERT_DIRECTION: false,
   } as const;

   export const PDF_MAX_BYTES = 200 * 1024 * 1024; // 200MB
   export const CAMERA_PREVIEW_W = 200;
   export const CAMERA_PREVIEW_H = 150;
   export const FEEDBACK_DURATION_MS = 300;
   export const DEBUG_REFRESH_HZ = 10;
   ```

3. **판정 로직 (`lib/domain/swipeDetector.ts`)**:
   - `createInitialState(): DetectorState`
   - `detectSwipe(state: DetectorState, sample: Sample, config: SwipeConfig): DetectResult`
   - 의사코드(§5.3) 그대로 구현
   - `INVERT_DIRECTION: true`일 때 'left'/'right' 결과 뒤집기
   - **순수 함수**: state는 readonly, 새 객체 반환

4. **테스트 작성 (TDD: 케이스를 먼저 다 적고 구현)**:

   필수 케이스 (12개 이상):

   | #    | 입력                                                           | 기대 결과                                 |
   | ---- | -------------------------------------------------------------- | ----------------------------------------- |
   | T-01 | 빈 buffer + 1 sample                                           | swipe=null, buffer 1개                    |
   | T-02 | 5개 Open_Palm 샘플, score 0.9, x: 0.2→0.5 (delta=+0.3)         | swipe='right', buffer 비움, cooldown 설정 |
   | T-03 | 5개 Open_Palm, x: 0.7→0.4 (delta=-0.3)                         | swipe='left'                              |
   | T-04 | 5개 Open_Palm, x: 0.4→0.5 (delta=+0.1, < threshold)            | swipe=null                                |
   | T-05 | 5개 중 2개만 Open_Palm (ratio=0.4)                             | swipe=null                                |
   | T-06 | 5개 Open_Palm but score 0.5 (< MIN_SCORE) → 비-Open으로 카운트 | swipe=null                                |
   | T-07 | sample.t < cooldownUntil (쿨다운 중)                           | swipe=null, buffer는 정리됨               |
   | T-08 | 윈도우 외 샘플 1개 + 신규 5개 → 외부 샘플 제거됨               | 신규 기준으로 판정                        |
   | T-09 | INVERT_DIRECTION=true, delta=+0.3                              | swipe='left' (반전)                       |
   | T-10 | MIN_SAMPLES=5, 4개만 모음                                      | swipe=null                                |
   | T-11 | 스와이프 후 cooldownUntil = sample.t + COOLDOWN_MS             | true                                      |
   | T-12 | 스와이프 후 buffer는 빈 배열                                   | true                                      |
   | T-13 | 동일 t 샘플 여러 개 (이론상 가능)                              | 안정적으로 처리                           |
   | T-14 | x 값이 [0,1] 밖 (이론상 0.95→1.05)                             | swipe 발사 (방어 코드 없이도 정상)        |

5. **테스트 실행**:

   ```bash
   npm test
   ```

6. 커밋:
   ```bash
   git add lib/domain tests/domain
   git commit -m "feat(domain): swipe detector with full unit tests"
   ```

**검증**:

- [ ] `npm test` 모두 통과 (12+ 케이스)
- [ ] `npm run check` 0 exit
- [ ] `swipeDetector.ts`가 React, DOM, MediaPipe 임포트 0 (확인: `grep -r "react\|mediapipe\|window\|document" lib/domain/`)
- [ ] `swipeDetector.ts` ≤ 200줄

**완료 기준**:

- 모든 케이스 그린
- 도메인 레이어 외부 의존 0
- ESLint 통과 (특히 `no-restricted-imports`)

**흔한 함정**:

- `Date.now()` 사용 금지 — 인자로 받은 `sample.t`만 신뢰. (시간 의존 테스트는 결정적이지 않음)
- 빈 배열 슬라이스 시 `array[0]` 접근에 `noUncheckedIndexedAccess` 적용되어 `Sample | undefined` — `if (buffer.length === 0)` 가드 필수.
- `buffer`는 readonly. `push`/`splice` 금지. 새 배열 생성.

---

### Sprint 2 — 인프라 레이어 (외부 시스템 어댑터)

**목표**: 카메라/MediaPipe/PDF 로더를 단순한 함수/클래스로 감싸서 도메인 위에 얇은 어댑터 만들기.

**예상 시간**: 4~5시간

**사전 조건**: Sprint 1 완료.

**산출물**:

- `lib/infrastructure/camera.ts`
- `lib/infrastructure/mediapipe.ts`
- `lib/infrastructure/pdfLoader.ts`
- `lib/infrastructure/time.ts`

**작업 단계**:

1. **카메라 (`lib/infrastructure/camera.ts`)**:

   ```typescript
   export type CameraHandle = {
     stream: MediaStream;
     stop: () => void;
   };

   export async function startCamera(
     constraints?: MediaTrackConstraints,
   ): Promise<CameraHandle> {
     const stream = await navigator.mediaDevices.getUserMedia({
       video: { width: 640, height: 480, facingMode: "user", ...constraints },
       audio: false,
     });
     return {
       stream,
       stop: () => stream.getTracks().forEach((t) => t.stop()),
     };
   }

   export type CameraErrorKind =
     | "permission_denied"
     | "not_found"
     | "in_use"
     | "unknown";

   export function classifyCameraError(err: unknown): CameraErrorKind {
     if (!(err instanceof Error)) return "unknown";
     if (err.name === "NotAllowedError") return "permission_denied";
     if (err.name === "NotFoundError") return "not_found";
     if (err.name === "NotReadableError") return "in_use";
     return "unknown";
   }
   ```

2. **MediaPipe (`lib/infrastructure/mediapipe.ts`)**:

   ```typescript
   import { GestureRecognizer, FilesetResolver } from "@mediapipe/tasks-vision";
   import type { GestureName, Sample } from "@/lib/domain/types";

   const WASM_CDN =
     "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm";
   const MODEL_URL =
     "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/" +
     "gesture_recognizer/float16/1/gesture_recognizer.task";

   export type GestureLoop = {
     recognize: (video: HTMLVideoElement, t: number) => Sample | null;
     close: () => void;
   };

   export async function createGestureLoop(): Promise<GestureLoop> {
     const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
     const recognizer = await GestureRecognizer.createFromOptions(vision, {
       baseOptions: { modelAssetPath: MODEL_URL },
       runningMode: "VIDEO",
       numHands: 1,
     });

     return {
       recognize(video, t) {
         const result = recognizer.recognizeForVideo(video, t);
         const top = result.gestures?.[0]?.[0];
         const wrist = result.landmarks?.[0]?.[0];
         if (!top || !wrist) return null;
         return {
           t,
           x: wrist.x,
           gesture: top.categoryName as GestureName,
           score: top.score ?? 0,
         };
       },
       close() {
         recognizer.close();
       },
     };
   }
   ```

3. **PDF 로더 (`lib/infrastructure/pdfLoader.ts`)**:

   ```typescript
   import { PDF_MAX_BYTES } from "@/lib/domain/config";

   export type PdfLoadResult = {
     blobUrl: string;
     name: string;
     bytes: number;
   };

   export type PdfErrorKind = "too_large" | "invalid_type" | "read_failed";

   export function validatePdf(file: File): PdfErrorKind | null {
     if (file.type !== "application/pdf") return "invalid_type";
     if (file.size > PDF_MAX_BYTES) return "too_large";
     return null;
   }

   export function loadPdf(file: File): PdfLoadResult {
     const blobUrl = URL.createObjectURL(file);
     return { blobUrl, name: file.name, bytes: file.size };
   }

   export function disposePdf(blobUrl: string): void {
     URL.revokeObjectURL(blobUrl);
   }
   ```

4. **시간 (`lib/infrastructure/time.ts`)**:

   ```typescript
   export const now = (): number => performance.now();
   ```

   (`Date.now()`는 시스템 시계 변경 영향 받음. `performance.now()`는 모노토닉.)

5. 커밋:
   ```bash
   git add lib/infrastructure
   git commit -m "feat(infra): camera, mediapipe, pdf loader adapters"
   ```

**검증**:

- [ ] `npm run check` 0 exit
- [ ] 모든 파일 ≤ 200줄
- [ ] Infrastructure가 Application/Components/App을 import 안 함 (확인: `grep -r "from '@/components\|from '@/app\|from '@/lib/application" lib/infrastructure/`)

**완료 기준**:

- 4개 파일 모두 컴파일/린트 통과
- 함수 시그니처가 §6.4 의존성 규칙 준수

**흔한 함정**:

- MediaPipe wasm/모델 CDN URL이 변경될 수 있음 — 명시적 버전 핀 (0.10.18) 사용. 회사 망에서 CDN 차단되면 `public/models/`에 직접 다운로드해서 호스팅.
- `URL.createObjectURL` 후 `revokeObjectURL` 안 하면 메모리 누수. 발표 종료 시 반드시 `disposePdf` 호출.
- `recognizer.recognizeForVideo`는 같은 `t`로 두 번 호출 시 에러 — 매 프레임 monotonic하게 증가하는 `t` 보장.

---

### Sprint 3 — Application 레이어 (Hooks)

**목표**: Domain + Infrastructure를 React 훅으로 연결. 컴포넌트는 이 훅만 사용.

**예상 시간**: 4~5시간

**사전 조건**: Sprint 2 완료.

**산출물**:

- `lib/application/usePdfDocument.ts`
- `lib/application/useGestureLoop.ts`
- `lib/application/useKeyboardNav.ts`

**작업 단계**:

1. **PDF 훅**:

   ```typescript
   // lib/application/usePdfDocument.ts
   import { useState, useEffect, useCallback } from "react";
   import {
     loadPdf,
     disposePdf,
     validatePdf,
     type PdfLoadResult,
     type PdfErrorKind,
   } from "@/lib/infrastructure/pdfLoader";

   export type PdfState = {
     pdf: PdfLoadResult | null;
     error: PdfErrorKind | null;
     pageCount: number;
     currentPage: number;
   };

   export function usePdfDocument() {
     const [state, setState] = useState<PdfState>({
       pdf: null,
       error: null,
       pageCount: 0,
       currentPage: 1,
     });

     const open = useCallback((file: File) => {
       const err = validatePdf(file);
       if (err) {
         setState((s) => ({ ...s, error: err, pdf: null }));
         return;
       }
       const pdf = loadPdf(file);
       setState({ pdf, error: null, pageCount: 0, currentPage: 1 });
     }, []);

     const setPageCount = useCallback((n: number) => {
       setState((s) => ({ ...s, pageCount: n }));
     }, []);

     const goNext = useCallback(() => {
       setState((s) =>
         s.currentPage < s.pageCount
           ? { ...s, currentPage: s.currentPage + 1 }
           : s,
       );
     }, []);

     const goPrev = useCallback(() => {
       setState((s) =>
         s.currentPage > 1 ? { ...s, currentPage: s.currentPage - 1 } : s,
       );
     }, []);

     const goFirst = useCallback(
       () => setState((s) => ({ ...s, currentPage: 1 })),
       [],
     );
     const goLast = useCallback(
       () => setState((s) => ({ ...s, currentPage: s.pageCount })),
       [],
     );

     const close = useCallback(() => {
       setState((s) => {
         if (s.pdf) disposePdf(s.pdf.blobUrl);
         return { pdf: null, error: null, pageCount: 0, currentPage: 1 };
       });
     }, []);

     useEffect(
       () => () => {
         if (state.pdf) disposePdf(state.pdf.blobUrl);
       },
       [],
     );
     // ⚠️ 의존성 배열 의도적 빈 — 언마운트 시만 정리. ESLint 주석 필요.

     return {
       state,
       open,
       setPageCount,
       goNext,
       goPrev,
       goFirst,
       goLast,
       close,
     };
   }
   ```

2. **제스처 루프 훅 (가장 복잡)**:

   ```typescript
   // lib/application/useGestureLoop.ts
   import { useEffect, useRef, useState } from "react";
   import {
     startCamera,
     classifyCameraError,
     type CameraErrorKind,
     type CameraHandle,
   } from "@/lib/infrastructure/camera";
   import {
     createGestureLoop,
     type GestureLoop,
   } from "@/lib/infrastructure/mediapipe";
   import { now } from "@/lib/infrastructure/time";
   import { detectSwipe, createInitialState } from "@/lib/domain/swipeDetector";
   import { DEFAULT_SWIPE_CONFIG } from "@/lib/domain/config";
   import type {
     DetectorState,
     Sample,
     SwipeDirection,
   } from "@/lib/domain/types";

   export type LoopStatus = "idle" | "starting" | "running" | "error";
   export type LoopError = CameraErrorKind | "mediapipe_load_failed";

   export type UseGestureLoopArgs = {
     videoRef: React.RefObject<HTMLVideoElement>;
     onSwipe: (dir: SwipeDirection) => void;
     onSample?: (sample: Sample) => void; // 디버그용
     enabled: boolean;
   };

   export function useGestureLoop({
     videoRef,
     onSwipe,
     onSample,
     enabled,
   }: UseGestureLoopArgs) {
     const [status, setStatus] = useState<LoopStatus>("idle");
     const [error, setError] = useState<LoopError | null>(null);
     const handleRef = useRef<{
       camera: CameraHandle;
       gesture: GestureLoop;
     } | null>(null);
     const stateRef = useRef<DetectorState>(createInitialState());
     const rafRef = useRef<number | null>(null);

     useEffect(() => {
       if (!enabled) return;
       let cancelled = false;
       setStatus("starting");
       setError(null);

       (async () => {
         try {
           const camera = await startCamera();
           if (cancelled) {
             camera.stop();
             return;
           }
           const video = videoRef.current;
           if (!video) throw new Error("video ref missing");
           video.srcObject = camera.stream;
           await video.play();

           const gesture = await createGestureLoop();
           if (cancelled) {
             camera.stop();
             gesture.close();
             return;
           }
           handleRef.current = { camera, gesture };
           setStatus("running");

           const tick = () => {
             if (cancelled || !handleRef.current) return;
             const t = now();
             const sample = handleRef.current.gesture.recognize(video, t);
             if (sample) {
               onSample?.(sample);
               const result = detectSwipe(
                 stateRef.current,
                 sample,
                 DEFAULT_SWIPE_CONFIG,
               );
               stateRef.current = result.state;
               if (result.swipe) onSwipe(result.swipe);
             }
             rafRef.current = requestAnimationFrame(tick);
           };
           tick();
         } catch (e) {
           if (cancelled) return;
           const camErr = classifyCameraError(e);
           setError(camErr === "unknown" ? "mediapipe_load_failed" : camErr);
           setStatus("error");
         }
       })();

       return () => {
         cancelled = true;
         if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
         if (handleRef.current) {
           handleRef.current.camera.stop();
           handleRef.current.gesture.close();
           handleRef.current = null;
         }
         stateRef.current = createInitialState();
         setStatus("idle");
       };
     }, [enabled, videoRef, onSwipe, onSample]);

     return { status, error };
   }
   ```

3. **키보드 백업 훅**:

   ```typescript
   // lib/application/useKeyboardNav.ts
   import { useEffect } from "react";

   export type KeyHandlers = {
     onNext: () => void;
     onPrev: () => void;
     onFirst: () => void;
     onLast: () => void;
     onExit: () => void;
   };

   export function useKeyboardNav(h: KeyHandlers, enabled: boolean) {
     useEffect(() => {
       if (!enabled) return;
       const handler = (e: KeyboardEvent) => {
         switch (e.key) {
           case "ArrowRight":
           case " ":
           case "PageDown":
             h.onNext();
             break;
           case "ArrowLeft":
           case "Backspace":
           case "PageUp":
             h.onPrev();
             break;
           case "Home":
             h.onFirst();
             break;
           case "End":
             h.onLast();
             break;
           case "Escape":
             h.onExit();
             break;
         }
       };
       window.addEventListener("keydown", handler);
       return () => window.removeEventListener("keydown", handler);
     }, [enabled, h]);
   }
   ```

4. 커밋:
   ```bash
   git add lib/application
   git commit -m "feat(app): hooks for pdf, gesture loop, keyboard nav"
   ```

**검증**:

- [ ] `npm run check` 통과
- [ ] 각 파일 ≤ 250줄
- [ ] `useGestureLoop`이 cleanup 함수에서 카메라/MediaPipe 모두 정리하는지 코드 리뷰

**완료 기준**:

- 훅 시그니처가 컴포넌트에서 사용하기 직관적
- cleanup 누락 없음

**흔한 함정**:

- `useEffect`의 cleanup 함수에서 카메라 stop 안 하면 빨간 LED가 안 꺼짐. 명시적 검증.
- `requestAnimationFrame` 콜백에서 컴포넌트 언마운트 후 setState 호출 시 React warning. `cancelled` 플래그 + ref로 가드.
- `useEffect` 의존성에 `onSwipe`, `onSample` 들어가면 매 렌더마다 루프 재시작 → **컴포넌트에서 `useCallback`으로 안정화 필수**.

---

### Sprint 4 — 시작 화면 + 발표 모드 컴포넌트

**목표**: 사용자에게 보이는 모든 UI를 완성.

**예상 시간**: 5~6시간

**사전 조건**: Sprint 3 완료.

**산출물**:

- `app/page.tsx`, `app/present/page.tsx`, `app/error.tsx`, `app/globals.css`
- `components/PdfDropzone.tsx`, `components/CameraPermission.tsx`
- `components/PdfViewer.tsx`, `components/CameraPreview.tsx`
- `components/GestureController.tsx`, `components/SwipeFeedback.tsx`
- `components/PageIndicator.tsx`

**작업 단계**:

1. **글로벌 스타일 (`app/globals.css`)** — CSS 리셋 + 변수 + 키프레임:

   ```css
   :root {
     --bg: #0a0a0a;
     --fg: #f5f5f5;
     --accent: #00d9c0;
     --error: #ff5a5f;
     --muted: #888;
   }
   * {
     box-sizing: border-box;
   }
   html,
   body {
     margin: 0;
     padding: 0;
     background: var(--bg);
     color: var(--fg);
     font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
   }
   @keyframes glow-right {
     0%,
     100% {
       box-shadow: inset -16px 0 0 transparent;
     }
     50% {
       box-shadow: inset -16px 0 24px var(--accent);
     }
   }
   @keyframes glow-left {
     0%,
     100% {
       box-shadow: inset 16px 0 0 transparent;
     }
     50% {
       box-shadow: inset 16px 0 24px var(--accent);
     }
   }
   @keyframes shake {
     0%,
     100% {
       transform: translateX(0);
     }
     25% {
       transform: translateX(-8px);
     }
     75% {
       transform: translateX(8px);
     }
   }
   ```

2. **PDF Dropzone**:
   - `<input type="file" accept="application/pdf">`
   - 드래그앤드롭 (`onDragOver`, `onDrop`)
   - 선택된 파일명 + 페이지 수 표시 (페이지 수는 `usePdfDocument`에서)
   - 에러 표시

3. **CameraPermission**:
   - 첫 진입 시 자동으로 `getUserMedia` 호출 X — 명시적 버튼 클릭 시 호출 (UX 권장)
   - 상태: idle / requesting / granted / denied / not_found
   - denied 시 안내 + 재시도

4. **PdfViewer**:
   - `import { Document, Page, pdfjs } from 'react-pdf';`
   - Worker 설정: `pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;`
     ```typescript
     import { pdfjs } from "react-pdf";
     pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
     ```
   - 현재 페이지 + 인접 페이지(±1)를 동시 마운트, CSS로 비현재 페이지 숨김 → 즉시 전환
   - `onLoadSuccess` 콜백으로 `pageCount` 보고

5. **CameraPreview**:
   - `<video ref={videoRef} autoPlay muted playsInline style={{ transform: 'scaleX(-1)' }}>`
   - 우상단 absolute, 200×150
   - 1px 보더 + 박스섀도

6. **GestureController** (UI 없음 + 훅 호스트):

   ```tsx
   export function GestureController({ videoRef, onSwipe, debug }: Props) {
     const { status, error } = useGestureLoop({
       videoRef,
       onSwipe,
       enabled: true,
       onSample: debug?.onSample,
     });
     // 에러는 부모에 콜백으로 전달하거나 토스트로 표시
     return null; // (선택) 또는 상태 인디케이터
   }
   ```

7. **SwipeFeedback**:
   - props로 `direction: 'left' | 'right' | null`, `boundary: 'first' | 'last' | null` 받음
   - 0.3초 후 자동으로 null 처리 (timeout 사용 + cleanup)
   - 가장자리 글로우 또는 흔들림 클래스 토글

8. **PageIndicator**: 좌하단 작은 박스. `current / total`.

9. **app/page.tsx** — PdfDropzone + CameraPermission + 발표시작 버튼.

10. **app/present/page.tsx** — 모든 컴포넌트 조립:
    - PdfViewer (전체 화면)
    - CameraPreview (우상단)
    - GestureController (논비주얼, 훅 실행)
    - SwipeFeedback (오버레이)
    - PageIndicator (좌하단)
    - useKeyboardNav (백업)
    - 라우팅 가드: PDF/MediaStream 없으면 `/`로 리다이렉트

11. PDF 파일 전달 방식:
    - 시작 화면 → 발표 모드로 File 객체 전달이 까다로움 (Next.js 라우팅에선 일반적으로 안 됨)
    - **선택지 A** (권장): React Context로 메모리 공유. App Router에서는 `'use client'` 컨텍스트 필요. `app/layout.tsx`를 client wrapper로 감싸는 방식.
    - **선택지 B**: `sessionStorage`에 blob URL만 저장 + File 자체는 다시 받지 않는 단순화. 새로고침 시 PDF 사라짐 (PoC 허용).
    - **선택지 C**: 단일 페이지 SPA화 — `/`만 있고 상태로 화면 전환. 가장 단순. **이쪽 권장**.

    → **권장: 단일 페이지 SPA**. `app/page.tsx` 안에서 `mode: 'idle' | 'present'` 상태로 화면 전환. 라우팅 분리하지 않음. 이렇게 하면 `app/present/` 디렉토리는 만들지 않아도 됨 → 파일 수 ↓.

    ⚠️ §6.1의 디렉토리 구조에서 `app/present/page.tsx`를 제거하고 `app/page.tsx`가 두 모드를 관리하도록 변경. 이 결정은 Sprint 4 시작 시 확정.

12. 커밋:
    ```bash
    git add components app
    git commit -m "feat(ui): start screen + present mode components"
    ```

**검증**:

- [ ] `npm run check` 통과
- [ ] `npm run dev` → `http://localhost:3000`
- [ ] 시작 화면에서 PDF 업로드 가능
- [ ] 카메라 권한 요청 동작
- [ ] 발표 모드 진입 시 카메라 프리뷰 표시
- [ ] 키보드 화살표로 페이지 변경 동작
- [ ] ESC로 시작 화면 복귀
- [ ] 모든 파일 ≤ 800줄

**완료 기준**:

- 화면 1, 2의 와이어프레임이 실제로 보임
- 키보드 네비게이션 모든 키 동작
- 카메라 LED가 발표 모드 진입 시 켜지고, 종료 시 꺼짐 (수동 확인)

**흔한 함정**:

- `react-pdf`가 SSR에서 깨질 수 있음 — `'use client'` 디렉티브 필수.
- `pdf.worker.min.mjs` URL이 mjs 확장자여야 함 (구버전은 `.js`). pdfjs-dist 4.x는 `.mjs`.
- `<video>` `srcObject` 할당 후 `play()` 안 하면 검은 화면. 명시적 `await video.play()`.
- File 객체는 라우트 간 전달 불가능 — SPA 방식 권장.
- 발표 모드에서 PDF가 작게 표시되면 `width`를 viewport 기준으로 동적 계산: `<Page width={containerWidth}>`.

---

### Sprint 5 — 시각 피드백 + 엣지 케이스 마무리

**목표**: 모든 엣지 케이스 처리. 시각 피드백 완성.

**예상 시간**: 3~4시간

**사전 조건**: Sprint 4 완료.

**산출물**:

- 엣지 케이스 표(§4.6)의 모든 항목 처리
- SwipeFeedback 완성
- 토스트/안내 메시지 컴포넌트

**작업 단계**:

1. **시각 피드백 동작**:
   - `SwipeFeedback`이 props 변경 시 0.3초 글로우/흔들림 후 자동 클리어
   - `useEffect` + `setTimeout` 사용. cleanup으로 누수 방지.

2. **페이지 한계 흔들림**:
   - 부모 컴포넌트에서 `goNext`/`goPrev` 호출 시 페이지 변경 발생 여부 확인
   - 변경 안 됐으면 SwipeFeedback의 boundary props 설정

3. **엣지 케이스 표 모두 구현**:
   - E-01 권한 거부 → 시작 화면에 안내 + 재시도 버튼
   - E-02 카메라 없음 → "키보드 모드로 진행" 옵션 제시
   - E-03 MediaPipe 실패 → 새로고침 안내 토스트
   - E-04 PDF 파싱 실패 → react-pdf의 `onLoadError` 콜백으로 안내
   - E-05 PDF 너무 큼 → `validatePdf`에서 사전 차단
   - E-09 비호환 브라우저 → User Agent 스니프 또는 `'mediaDevices' in navigator` 체크
   - E-10 visibilitychange → 카메라 일시정지 (`useGestureLoop`의 `enabled` 토글)

4. 커밋:
   ```bash
   git commit -m "feat(ui): swipe feedback + all edge cases"
   ```

**검증**:

- [ ] `npm run check` 통과
- [ ] 카메라 권한 거부 후 키보드 모드로 발표 가능
- [ ] 잘못된 PDF 업로드 시 에러 안내
- [ ] 첫/마지막 페이지에서 키보드 좌/우 입력 시 흔들림 발생

**완료 기준**:

- 엣지 케이스 표(§4.6) 10개 항목 모두 동작 확인

---

### Sprint 6 — 디버그 오버레이 + 통합 검증 + 튜닝

**목표**: 디버그 도구 완성. 실제 사용 환경에서 인식률 검증 및 파라미터 튜닝.

**예상 시간**: 3~4시간

**사전 조건**: Sprint 5 완료.

**산출물**:

- `components/DebugOverlay.tsx`
- §5.5 미러링 부호 검증 결과 (config.INVERT_DIRECTION 결정)
- §8.2 수동 체크리스트 통과

**작업 단계**:

1. **DebugOverlay**:
   - `useSearchParams`로 `?debug=1` 감지
   - GestureController에서 `onSample` 콜백으로 최신 샘플 받음
   - 100ms 주기로 패널 업데이트 (throttle)
   - 표시: gesture, score, x, buffer.length, 직전 deltaX, cooldown 남은 ms, fps

2. **실제 노트북에서 부호 검증**:
   - 디버그 모드 ON
   - 손바닥 우→좌 이동 → 콘솔/패널의 deltaX 부호 확인
   - §5.5 매핑이 맞으면 `INVERT_DIRECTION: false` 유지
   - 거꾸로면 `config.ts`에서 `INVERT_DIRECTION: true`로 변경, 단위 테스트 재실행

3. **파라미터 튜닝**:
   - 정상 조명, 50cm/1m/1.5m 거리에서 인식률 측정
   - 너무 둔하면 `DELTA_X_THRESHOLD` 0.20으로 ↓
   - 오작동 많으면 `OPEN_PALM_RATIO` 0.8로 ↑
   - 변경 시 단위 테스트 영향 확인

4. **수동 체크리스트** (§8.2) 전부 ✓

5. 최종 커밋:
   ```bash
   git commit -m "feat: debug overlay + tuning + manual QA pass"
   ```

**검증**:

- [ ] `?debug=1`로 진입 시 패널 표시
- [ ] §8.2 모든 항목 통과
- [ ] 정상 조명에서 10회 중 9회 이상 인식
- [ ] 1분 자연 발화 중 오작동 ≤ 1회

**완료 기준**:

- §1.4 성공 정의 5개 모두 만족
- README에 사용법 + 알려진 한계 기재

---

## 8. 테스트 전략

### 8.1 단위 테스트 (자동)

- 대상: `lib/domain/swipeDetector.ts` (외부 의존 0)
- 도구: Vitest
- 케이스: §7 Sprint 1의 T-01 ~ T-14 (12+ 케이스)
- 실행: `npm test`
- 통과 기준: 100% 그린, ≤ 10초

**Application/Infrastructure는 단위 테스트하지 않음** — 카메라/MediaPipe/DOM 모킹 비용 > 수동 검증 비용 (PoC).

### 8.2 수동 검증 체크리스트

**환경**:

- Lenovo 노트북, 웹캠 정면, 정상 사무실 조명, 50cm 거리.

**체크리스트**:

- [ ] **C-01**: PDF 업로드 → 페이지 수가 정확히 표시됨
- [ ] **C-02**: 카메라 권한 허용 후 발표 시작 버튼 활성화
- [ ] **C-03**: 발표 모드 진입 시 PDF 풀스크린 + 카메라 프리뷰 우상단 표시
- [ ] **C-04**: 우 스와이프 5회 시도 → 4회 이상 다음 페이지 이동
- [ ] **C-05**: 좌 스와이프 5회 시도 → 4회 이상 이전 페이지 이동
- [ ] **C-06**: 첫 페이지에서 좌 스와이프 → 흔들림, 페이지 변경 X
- [ ] **C-07**: 마지막 페이지에서 우 스와이프 → 흔들림, 페이지 변경 X
- [ ] **C-08**: 발표 중 1분간 자연스럽게 말하며 손짓 → 페이지 변경 ≤ 1회
- [ ] **C-09**: 키보드 →, ←, Home, End, ESC 모두 정상 동작
- [ ] **C-10**: ESC 후 시작 화면 복귀 + 카메라 LED 꺼짐
- [ ] **C-11**: 권한 거부 시 안내 메시지 + 재시도 가능
- [ ] **C-12**: 잘못된 파일 업로드(.txt 등) → 에러 메시지
- [ ] **C-13**: 50cm/1m/1.5m 거리 모두 인식 (1.5m에서 약화 OK, 단 0회는 안 됨)
- [ ] **C-14**: `?debug=1`로 진입 시 패널 표시 + 실시간 갱신
- [ ] **C-15**: 페이지 전환 시 깜빡임 없음 (인접 페이지 사전 마운트)
- [ ] **C-16**: 100MB PDF 업로드 시 OOM 없이 동작
- [ ] **C-17**: `npm run build` 성공 (≤ 60초)
- [ ] **C-18**: `npm start`로 프로덕션 빌드 실행 가능

### 8.3 PoC 완료 기준

- 단위 테스트 100% 그린
- 수동 체크리스트 모두 ✓
- §1.4 성공 정의 5개 모두 만족
- README의 "Quick Start" 그대로 따라했을 때 5분 내 첫 발표 데모 가능

---

## 9. CLAUDE.md 작성 지침

프로젝트 루트에 `CLAUDE.md`를 생성하고 아래 내용을 작성한다.

### 9.1 CLAUDE.md 전체 템플릿

```markdown
# Motion PPT Controller — 작업 지침

## 프로젝트 개요

브라우저 단독 모션 인식 PPT 컨트롤러 (Phase 1 PoC).
설계서: `/docs/2026-04-30-motion-ppt-controller-design.md` (또는 본 PoC를 받았을 때의 위치)

## 기술 스택 (변경 금지)

- Next.js 14 (App Router) + TypeScript strict
- @mediapipe/tasks-vision 0.10.18
- react-pdf 9.x + pdfjs-dist 4.x
- Vitest 1.x

새 의존성 추가 전에 사람에게 확인. Tailwind, Zustand, Redux, Storybook, Playwright 등은 거부됨 (설계서 §3.2 참조).

## Clean Architecture 레이어 (강제)
```

Presentation (app/, components/)
↓
Application (lib/application/)
↓
Infrastructure (lib/infrastructure/)
↓
Domain (lib/domain/)

````

### 의존성 규칙
- `lib/domain/`: 외부 의존 0. React, DOM, MediaPipe, fetch, `Date.now()` 임포트 금지.
- `lib/infrastructure/`: 외부 시스템 어댑터. Domain만 의존 가능.
- `lib/application/`: React 훅. Domain + Infrastructure 의존 가능.
- `components/`, `app/`: UI. Application 훅만 사용. Infrastructure 직접 호출 금지.

ESLint `no-restricted-imports`로 강제됨. 위반 시 빌드 실패.

## Harness Engineering — 자동 가드레일

### 모든 변경 후 필수 명령
```bash
npm run check
````

이 명령은 `tsc --noEmit && eslint && prettier --check && vitest run`를 순차 실행.
**실패 시 절대 우회하지 말 것** (`--no-verify` 등 금지).

### 강제 규칙 (ESLint)

- `max-lines: 800`: 단일 파일 800줄 초과 금지. 도달 시 분해.
- `no-explicit-any`: `any` 타입 금지. `unknown` + 타입 가드 사용.
- `no-non-null-assertion`: `!` 연산자 금지.
- `no-restricted-imports`: 레이어 위반 차단.

### 사전 커밋 게이트

husky가 매 커밋 시 `npm run check`를 자동 실행. 통과 못하면 커밋 차단.

## 코딩 컨벤션

### 일반

- TypeScript strict (`noUncheckedIndexedAccess: true`).
- 함수형 우선: 가능한 한 순수 함수, 불변 데이터.
- Props/타입은 readonly 권장.
- 매직 넘버 금지 — `lib/domain/config.ts`에 상수로 정의.
- 한국어 주석 OK. 코드 식별자는 영어.

### React

- 함수형 컴포넌트만. 클래스 컴포넌트 금지.
- 모든 클라이언트 컴포넌트 파일 상단에 `'use client'`.
- 훅 외부 부수효과 금지. `useEffect`에 cleanup 누락 금지 (특히 카메라/타이머/이벤트 리스너).
- props에 함수 전달 시 부모에서 `useCallback` 안정화.

### 비동기

- Promise 미처리 거부 금지. `async` 함수의 모든 throw는 호출자가 처리.
- `useEffect` 안 async는 IIFE 패턴: `useEffect(() => { (async () => { ... })(); }, [])`.

### 파일 구성

- 한 파일 한 책임. 800줄 한계.
- 디렉토리 구조는 설계서 §6.1을 따른다.

## 금지 항목 (재확인)

다음을 추가/구현하지 말 것:

- 백엔드 (Python, Node 서버, DB)
- 사용자 인증/계정
- PPTX 직접 렌더링 (PDF만)
- 모바일 지원
- 박수 인식
- 가상 커서 / Dwell time (Phase 2)
- 다국어
- 발표 자료 영구 저장
- 신규 의존성 (사전 협의 없이)

## Git 워크플로우

### 커밋 메시지 (Conventional Commits)

- `feat(scope): 짧은 설명`
- `fix(scope): ...`
- `chore(scope): ...`
- `test(scope): ...`
- `refactor(scope): ...`
- `docs(scope): ...`

scope 예: `domain`, `infra`, `app`, `ui`, `config`.

### 브랜치 전략 (PoC라 단순)

- `main`만 사용. 작은 단위로 자주 커밋.

### `--no-verify` 사용 금지

pre-commit hook이 실패하면 코드를 고친다. hook을 건드리지 않는다.

## 작업 순서 (설계서 §7 Sprint 정의)

1. Sprint 0: 부트스트랩
2. Sprint 1: 도메인 (TDD)
3. Sprint 2: 인프라
4. Sprint 3: 애플리케이션
5. Sprint 4: UI 컴포넌트 + 페이지
6. Sprint 5: 엣지 케이스 + 피드백
7. Sprint 6: 디버그 오버레이 + 튜닝

각 Sprint의 "검증" 단계를 통과 못하면 다음으로 넘어가지 않는다.

## 흔한 함정 (사전 학습)

1. `useEffect` cleanup에서 카메라 stop 누락 → 빨간 LED 안 꺼짐. **반드시 검증.**
2. MediaPipe `recognizeForVideo`에 같은 timestamp 두 번 → 에러. monotonic `t` 보장.
3. `URL.createObjectURL` 후 `revokeObjectURL` 안 함 → 메모리 누수.
4. PDF Worker URL 잘못 → react-pdf 무한 로딩. `pdfjs.version`을 그대로 쓸 것.
5. SSR에서 react-pdf 깨짐 → `'use client'` 필수.
6. 의존성 배열에 안정화 안 된 콜백 → 매 렌더 루프 재시작. `useCallback` 사용.
7. 카메라 좌우 반전 — UI는 `scaleX(-1)`, MediaPipe 입력은 원본. (설계서 §5.5 참조)

## 검증 명령 모음

```bash
npm run dev           # 개발 서버
npm run build         # 프로덕션 빌드
npm start             # 프로덕션 서버 (build 후)
npm run lint          # ESLint
npm run typecheck     # TypeScript
npm run test          # 단위 테스트 1회
npm run test:watch    # 테스트 watch 모드
npm run format        # Prettier 적용
npm run check         # 전체 검증 (커밋 전 필수)
```

## Definition of Done (모든 작업)

작업 완료 선언 전 확인:

- [ ] `npm run check` 0 exit
- [ ] 변경한 파일 ≤ 800줄
- [ ] 새로 추가한 도메인 로직에 테스트 있음
- [ ] CLAUDE.md / 설계서의 규칙 위반 없음
- [ ] 의도하지 않은 파일 변경 없음
- [ ] 한국어 주석/메시지가 자연스러움 (UI 텍스트)

## 사람에게 즉시 확인이 필요한 경우

- 새 의존성 추가
- 설계서/CLAUDE.md 변경
- 800줄 한계로 파일 분해 시 (분해 안 + 동의)
- 의존성 규칙 위반이 불가피하다고 판단될 때 (대안 검토 후)
- §1.3 비범위 항목 추가 요청 (Phase 2 기능 조기 진입 등)

````

### 9.2 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
````

### 9.3 .eslintrc.json (핵심 — 레이어 강제 + 800줄)

```json
{
  "extends": ["next/core-web-vitals", "next/typescript"],
  "plugins": ["@typescript-eslint"],
  "rules": {
    "max-lines": [
      "error",
      { "max": 800, "skipBlankLines": true, "skipComments": true }
    ],
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-non-null-assertion": "error",
    "@typescript-eslint/consistent-type-imports": "error",
    "no-restricted-imports": [
      "error",
      {
        "patterns": [
          {
            "group": [
              "@/components/*",
              "@/app/*",
              "@/lib/application/*",
              "@/lib/infrastructure/*"
            ],
            "message": "domain layer cannot import outer layers"
          }
        ]
      }
    ]
  },
  "overrides": [
    {
      "files": ["lib/domain/**/*.ts"],
      "rules": {
        "no-restricted-imports": [
          "error",
          {
            "patterns": [
              {
                "group": [
                  "react",
                  "react-dom",
                  "next/*",
                  "@/components/*",
                  "@/app/*",
                  "@/lib/application/*",
                  "@/lib/infrastructure/*",
                  "@mediapipe/*"
                ],
                "message": "domain must be pure: no React/Next/Infra/MediaPipe"
              }
            ]
          }
        ]
      }
    },
    {
      "files": ["lib/infrastructure/**/*.ts"],
      "rules": {
        "no-restricted-imports": [
          "error",
          {
            "patterns": [
              {
                "group": ["@/components/*", "@/app/*", "@/lib/application/*"],
                "message": "infrastructure cannot import application/components/app"
              }
            ]
          }
        ]
      }
    },
    {
      "files": ["lib/application/**/*.ts"],
      "rules": {
        "no-restricted-imports": [
          "error",
          {
            "patterns": [
              {
                "group": ["@/components/*", "@/app/*"],
                "message": "application cannot import components/app"
              }
            ]
          }
        ]
      }
    },
    {
      "files": ["components/**/*.tsx"],
      "rules": {
        "no-restricted-imports": [
          "error",
          {
            "patterns": [
              {
                "group": ["@/lib/infrastructure/*"],
                "message": "components must use application hooks, not infrastructure directly"
              },
              {
                "group": ["@/app/*"],
                "message": "components cannot import app"
              }
            ]
          }
        ]
      }
    },
    {
      "files": ["tests/**/*.ts", "tests/**/*.tsx"],
      "rules": {
        "max-lines": "off"
      }
    }
  ]
}
```

### 9.4 .prettierrc.json

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### 9.5 vitest.config.ts

```typescript
import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: false,
    coverage: {
      provider: "v8",
      include: ["lib/domain/**/*.ts"],
      thresholds: { lines: 90, functions: 90, branches: 80, statements: 90 },
    },
  },
  resolve: {
    alias: { "@": resolve(__dirname, ".") },
  },
});
```

### 9.6 README.md (빠른 시작)

````markdown
# Motion PPT Controller

브라우저에서 손동작으로 PDF 슬라이드를 넘기는 PoC.

## 빠른 시작

```bash
npm install
npm run dev
# http://localhost:3000
```
````

## 사용법

1. PDF 파일 업로드
2. 카메라 권한 허용
3. 발표 시작 클릭
4. 손바닥을 카메라에 보이고 좌/우로 휙 동작

## 키보드 단축키

- → / Space / PageDown: 다음
- ← / Backspace / PageUp: 이전
- Home / End: 처음 / 마지막
- ESC: 시작 화면

## 디버그 모드

`http://localhost:3000?debug=1`

## 알려진 한계

- 박수 인식 미지원
- 가상 커서 / 메뉴는 Phase 2
- Chrome/Edge만 지원 (Firefox 미보장)

## 개발

```bash
npm run check     # 타입+린트+포맷+테스트 (커밋 전 필수)
npm test          # 단위 테스트
npm run dev       # 개발 서버
```

자세한 작업 지침: `CLAUDE.md`
설계서: `docs/2026-04-30-motion-ppt-controller-design.md`

```

---

## 10. 부록

### 10.1 Phase 2 확장 노트 (참고용)

Phase 1 검증 완료 후 진행 결정 시 읽을 것.

**추가 기능**:
- 목차 오버레이: `Open_Palm`을 1.5초 정지 시 호출 (스와이프 ≠ 정지를 명확히 구분)
- 가상 커서: `Pointing_Up` 시 검지 끝(landmark 8) 좌표를 화면 좌표로 매핑 + 이동평균 필터
- Dwell-time 선택: 커서가 같은 항목에 1.5초 머물면 클릭 (원형 게이지 시각화)

**추가 파일 (예상 4개)**:
- `components/MenuOverlay.tsx`: 목차 표시
- `components/VirtualCursor.tsx`: 커서 + dwell 게이지
- `lib/domain/cursorMapper.ts`: 손 좌표 → 화면 좌표 + 저역통과 필터 (순수 함수)
- `lib/domain/dwellDetector.ts`: 1.5초 정지 판정 (순수 함수)

**모드 명세 (Phase 2)**:
```

스와이프 모드 (기본)
└─ Open_Palm 1.5초 정지 → 메뉴 모드
메뉴 모드
├─ Pointing_Up → 커서 활성
├─ 항목 1.5초 dwell → 점프 + 메뉴 닫고 스와이프 모드
└─ Open_Palm 1.5초 다시 정지 → 메뉴 닫고 스와이프 모드

```

**데이터 추가**:
- 목차 항목 리스트 — PDF 업로드 시 사용자가 텍스트 입력하거나 별도 `.txt` 파일 (예: `slide-titles.txt` 한 줄에 한 제목)

### 10.2 트러블슈팅

| 증상 | 원인 후보 | 해결 |
|---|---|---|
| 카메라 LED는 켜지는데 프리뷰 검은 화면 | `video.play()` 호출 누락 | `srcObject` 할당 후 `await video.play()` |
| MediaPipe 무한 로딩 | wasm/모델 CDN 차단 | 회사망인 경우 모델을 `public/models/`에 저장하고 로컬 경로 사용 |
| react-pdf "Failed to load PDF" | Worker URL 오류 | `pdfjs.GlobalWorkerOptions.workerSrc` 정확히 설정 |
| 페이지 전환 시 깜빡임 | 인접 페이지 사전 마운트 누락 | `<Page pageNumber={n-1}>`, `<Page pageNumber={n}>`, `<Page pageNumber={n+1}>` 동시 마운트, 비현재 `display: none` |
| 우 스와이프인데 이전 페이지 | 카메라 좌우 반전 (§5.5) | `config.INVERT_DIRECTION = true` |
| 빨간 LED가 안 꺼짐 | cleanup 누락 | `useGestureLoop`의 useEffect cleanup 검증 |
| 'any' 못 쓴다고 ESLint 에러 | strict 모드 | `unknown` + 타입 가드 또는 정확한 타입 |
| 800줄 한계 도달 | 책임 분산 부족 | 컴포넌트/훅 분해 (사람에게 분해안 확인) |
| `npm run check` 느림 | 캐시 미사용 | `tsc --incremental`이 자동 캐시 (`.next/cache`) |

### 10.3 참고 링크

- MediaPipe Gesture Recognizer 문서: https://ai.google.dev/edge/mediapipe/solutions/vision/gesture_recognizer/web_js
- react-pdf 가이드: https://github.com/wojtekmaj/react-pdf
- Next.js App Router: https://nextjs.org/docs/app
- WebRTC getUserMedia: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia

### 10.4 용어집

| 용어 | 의미 |
|---|---|
| MediaPipe | Google의 비전/오디오 처리 ML 라이브러리. 본 PoC는 Gesture Recognizer만 사용 |
| Landmark | 손/얼굴 등의 키포인트. 본 PoC는 손목(0번)만 사용 |
| Dwell time | 커서가 일정 시간 같은 위치에 머무는 동작. 클릭 대체 입력 |
| Cooldown | 동작 발사 후 일정 시간 무시 (중복 발사 방지) |
| Sliding window | 최근 N ms 동안의 샘플만 보유하는 데이터 구조 |
| Clean Architecture | 레이어 분리 + 의존성 단방향 아키텍처 (Robert C. Martin) |
| Harness | 코드 외부에서 자동으로 검증/제어하는 도구 모음 (린트, 타입체커, 테스트, hook 등) |
| Single Source of Truth | 한 정보가 한 곳에만 존재. 본 PoC는 `lib/domain/config.ts`가 튜닝 상수 단일 출처 |
| TDD | Test-Driven Development. 테스트 먼저 작성 후 구현 |
| DoD | Definition of Done. 작업 완료의 객관적 기준 |
| FR / NFR | Functional / Non-Functional Requirement |

### 10.5 변경 이력

| 일자 | 변경 | 작성자 |
|---|---|---|
| 2026-04-30 | 초안 작성 | (협업 브레인스토밍 결과) |

---

## 결론

이 문서는 처음부터 끝까지 직접 설계하고 구현한 내용을 담고 있다. Sprint 0~6을 순서대로 진행하면 PoC가 완성된다.

**핵심 가드레일 (반복 강조)**:
1. `npm run check`를 매 변경 후 실행 — 통과 못하면 다음으로 못 감.
2. 단일 파일 ≤ 800줄.
3. 레이어 의존성 단방향 (Domain ← Infra ← App ← UI).
4. 도메인 로직은 순수 함수 + 단위 테스트.
5. `--no-verify` 등으로 hook 우회 금지.
6. 비범위 항목(§1.3) 추가 거부.
7. 막히면 사람에게 확인 — 임의 결정 금지.

질문/이슈는 본 문서의 변경 이력에 기록할 것.
```
